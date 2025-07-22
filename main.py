import pandas as pd
import yaml
from datetime import datetime
import eel
import threading
import os
import sys

from modules.data_acquirer import fetch_bcb_series
from modules.data_processor import process_series_data, infer_periodicity
from modules.data_exporter import export_dataframe
from persistence.sqlite_adapter import SQLiteAdapter

# Inicializa o Eel
eel.init("frontend")

def get_base_path(path):
    """Retorna o caminho base para encontrar os arquivos de recurso."""
    if getattr(sys, "frozen", False):
        # Se o programa estiver "congelado" (rodando como .exe)
        # o caminho base é o diretório temporário _MEIPASS
        return os.path.join(sys._MEIPASS, path)
    else:
        # Se estiver rodando como script .py normal
        # O caminho base é o diretório onde o script está
        return os.path.join(os.path.dirname(os.path.abspath(__file__)), path)

def send_log_to_frontend(message):
    """
    Envia mensagens de log para a interface web.
    """
    print(message) # Mantém o print no terminal para debug
    eel.add_log(message)()

@eel.expose
def start_data_collection():
    """
    Função exposta para a interface web para iniciar a coleta de dados.
    Executa em uma thread separada para não bloquear a UI.
    """
    threading.Thread(target=_run_data_collection).start()

@eel.expose
def get_series_list():
    """
    Retorna a lista de séries disponíveis no banco de dados.
    """
    config_path = get_base_path("config.yaml")
    try:
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        return []

    db_config = config.get("database", {})
    db_type = db_config.get("type")
    db_name = db_config.get("db_name")

    if db_type == "sqlite":
        adapter = SQLiteAdapter(db_name)
        adapter.connect()
        try:
            table_names = adapter.get_table_names()
            return table_names
        finally:
            adapter.disconnect()
    
    return []

@eel.expose
def get_series_data(series_name: str):
    """
    Retorna os dados de uma série específica.
    """
    config_path = get_base_path("config.yaml")
    try:
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        return []

    db_config = config.get("database", {})
    db_type = db_config.get("type")
    db_name = db_config.get("db_name")

    if db_type == "sqlite":
        adapter = SQLiteAdapter(db_name)
        adapter.connect()
        try:
            df = adapter.fetch_full_table_data(series_name)
            return df.to_dict("records")
        finally:
            adapter.disconnect()
    
    return []

@eel.expose
def export_series(series_name: str, export_format: str):
    """
    Exporta uma série para CSV ou Excel.
    """
    try:
        config_path = get_base_path("config.yaml")
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)

        db_config = config.get("database", {})
        db_type = db_config.get("type")
        db_name = db_config.get("db_name")

        if db_type == "sqlite":
            adapter = SQLiteAdapter(db_name)
            adapter.connect()
            try:
                df = adapter.fetch_full_table_data(series_name)
                if not df.empty:
                    file_path = export_dataframe(df, export_format, series_name)
                    return {"success": True, "path": file_path}
                else:
                    return {"success": False, "error": "Nenhum dado encontrado para a série"}
            finally:
                adapter.disconnect()
        
        return {"success": False, "error": "Tipo de banco não suportado"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

@eel.expose
def validate_and_save_configuration(config_data: dict):
    """
    Valida e salva a configuração de séries.
    """
    current_config_path = get_base_path("config.yaml")
    try:
        with open(current_config_path, "r") as f:
            current_config = yaml.safe_load(f)
    except FileNotFoundError:
        current_config = {"database": {"type": "sqlite", "db_name": "dados_bcb.db"}, "series_codes": {}}

    # Critério 3: Inicializar estruturas de verificação de unicidade
    unique_codes = set()
    unique_table_names = set()
    
    new_series_codes = {}
    for series in config_data.get("series", []):
        code = str(series["code"])
        table_name = series["table_name"]
        periodicidade = series["periodicidade"]

        # Critério 3: Verificação de duplicatas na lista atual
        if code in unique_codes:
            return {"success": False, "error": f"Código de série duplicado encontrado: {code}"}
        if table_name in unique_table_names:
            return {"success": False, "error": f"Nome de tabela duplicado encontrado: {table_name}"}
        
        unique_codes.add(code)
        unique_table_names.add(table_name)

        # Critério 1: Validação de Existência Baseada na Periodicidade
        try:
            # Definir intervalo dinâmico baseado na periodicidade
            if periodicidade == "diaria":
                days_back = 30
            elif periodicidade == "mensal":
                days_back = 90
            elif periodicidade == "anual":
                days_back = 366
            else:
                days_back = 30  # padrão para periodicidades não reconhecidas
            
            start_date = datetime.now() - pd.Timedelta(days=days_back)
            test_data = fetch_bcb_series(code, start_date, datetime.now(), table_name)
            
            if test_data.empty:
                return {"success": False, "error": f"Série {code} ({table_name}) não retornou dados. Verifique o código da série."}
        except Exception as e:
            return {"success": False, "error": f"Erro ao validar série {code} ({table_name}): {str(e)}"}

        # Critério 2: Validação Real de Periodicidade
        try:
            test_data = process_series_data(test_data, code)
            inferred_periodicity = infer_periodicity(test_data)
            if inferred_periodicity != periodicidade and inferred_periodicity != "Desconhecida":
                return {"success": False, "error": f"Periodicidade inconsistente para série {code} ({table_name}). Esperado: {periodicidade}, Detectado: {inferred_periodicity}"}
        except Exception as e:
            return {"success": False, "error": f"Erro ao validar periodicidade da série {code} ({table_name}): {str(e)}"}
        
        new_series_codes[code] = table_name

    current_config["series_codes"] = new_series_codes

    try:
        with open(current_config_path, "w") as f:
            yaml.safe_dump(current_config, f, sort_keys=False)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": f"Erro ao salvar config.yaml: {str(e)}"}

@eel.expose
def get_current_config():
    """
    Retorna a configuração atual do config.yaml.
    """
    config_path = get_base_path("config.yaml")
    try:
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
            return config
    except FileNotFoundError:
        return {"database": {"type": "sqlite", "db_name": "dados_bcb.db"}, "series_codes": {}}

def _run_data_collection():
    """
    Lógica principal de coleta de dados, movida para uma função separada.
    """
    send_log_to_frontend("Iniciando processo de coleta de dados...")
    config = {}
    config_path = get_base_path("config.yaml")
    try:
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        send_log_to_frontend(f"Erro: Arquivo config.yaml não encontrado em {config_path}.")
        eel.collection_finished()()
        return

    db_config = config.get("database", {})
    db_type = db_config.get("type")
    db_name = db_config.get("db_name")
    
    try:
        if not db_type or not db_name:
            raise ValueError("Configuração do banco de dados inválida. Verifique o arquivo config.yaml.")
        if db_type == "sqlite":
            adapter = SQLiteAdapter(db_name)
        else:
            send_log_to_frontend(f"Erro: Tipo de banco de dados \'{db_type}\' não suportado.")
            eel.collection_finished()()
            return
    except Exception as e:
        send_log_to_frontend(f"Erro ao configurar o adaptador de banco de dados: {str(e)}")
        eel.collection_finished()()
        return

    adapter.connect()

    try:
        series_codes = config.get("series_codes", {})
        for code, series_name in series_codes.items():
            send_log_to_frontend(f"\nProcessando série: {series_name} (Código BCB: {code})")
            last_date = adapter.get_last_date(series_name)
            
            start_date = None
            if last_date:
                start_date = last_date + pd.Timedelta(days=1)
                send_log_to_frontend(f'Última data encontrada para {series_name}: {last_date.strftime("%Y-%m-%d")}. Buscando a partir de {start_date.strftime("%Y-%m-%d")}')
            else:
                start_date = datetime(1990, 1, 1)
                send_log_to_frontend(f'Nenhum registro encontrado para {series_name}. Buscando desde {start_date.strftime("%Y-%m-%d")}')

            raw_data = fetch_bcb_series(code, start_date, datetime.now(), series_name)
            processed_data = process_series_data(raw_data, code)

            if not processed_data.empty:
                if last_date:
                    processed_data = processed_data[processed_data["data"] > last_date]
                
                if not processed_data.empty:
                    adapter.save_data(series_name, processed_data)
                    send_log_to_frontend(f"{len(processed_data)} novos registros salvos para {series_name}.")
                else:
                    send_log_to_frontend(f"Nenhum novo registro para {series_name} desde a última atualização.")
            else:
                send_log_to_frontend(f"Nenhum dado retornado da API para a série {series_name}.")

    finally:
        adapter.disconnect()
        send_log_to_frontend("Processo de coleta de dados finalizado.")
        eel.collection_finished()()

if __name__ == "__main__":
    # Inicia a interface Eel
    eel.start("index.html", size=(1000, 700))

