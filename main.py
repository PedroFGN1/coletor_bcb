import eel
import threading
import yaml
import pandas as pd
from datetime import datetime

from methods._run_focus_collection import _run_focus_collection
from methods._run_series_collection import _run_series_collection
from modules.data_acquirer_sgs import fetch_bcb_series
from modules.data_acquirer_focus import fetch_bcb_focus
from modules.data_config_series import load_series_config
from utils.get_base_path import get_base_path
from modules.data_processor import process_series_data, infer_periodicity
from modules.data_exporter import export_dataframe
from persistence.sqlite_adapter import SQLiteAdapter

# Inicializa o Eel
eel.init("frontend")

@eel.expose
def start_data_collection():
    """
    Função exposta para a interface web para iniciar a coleta de dados.
    Executa em uma thread separada para não bloquear a UI.
    """
    threading.Thread(target=_run_series_collection).start()

@eel.expose
def start_focus_collection(endpoint: str, filters: dict):
    """
    Função exposta para a interface web para iniciar a coleta do Boletim Focus.
    Executa em uma thread separada para não bloquear a UI.
    """
    threading.Thread(target=_run_focus_collection, args=(endpoint, filters)).start()

@eel.expose
def save_focus_filters(config_data: dict):
    """
    Função exposta para salvar as configurações de filtros do Boletim Focus.
    """
    try:
        focus_config_path = get_base_path("focus_config.yaml")
        
        # Carregar configuração existente
        with open(focus_config_path, "r", encoding="utf-8") as f:
            focus_config = yaml.safe_load(f)
        
        # Adicionar seção de filtros salvos se não existir
        if "saved_filters" not in focus_config:
            focus_config["saved_filters"] = {}
        
        # Salvar os filtros do usuário
        focus_config["saved_filters"] = {
            "endpoint": config_data.get("endpoint"),
            "filters": config_data.get("filters", {}),
            "last_updated": datetime.now().isoformat()
        }
        
        # Salvar de volta no arquivo
        with open(focus_config_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(focus_config, f, default_flow_style=False, allow_unicode=True)
        
        return {"success": True, "message": "Filtros salvos com sucesso"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@eel.expose
def get_focus_saved_filters():
    """
    Função exposta para carregar as configurações salvas do Boletim Focus.
    """
    try:
        focus_config_path = get_base_path("focus_config.yaml")
        
        with open(focus_config_path, "r", encoding="utf-8") as f:
            focus_config = yaml.safe_load(f)
        
        saved_filters = focus_config.get("saved_filters", {})
        return {"success": True, "filters": saved_filters}
        
    except Exception as e:
        return {"success": False, "error": str(e), "filters": {}}

@eel.expose
def get_series_list():
    """
    Retorna a lista de séries disponíveis no banco de dados.
    """
    config_path = get_base_path("series_config.yaml")
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
    config = load_series_config()
    if not config:
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
        config = load_series_config()
        if not config:
            return {"success": False, "error": "Configuração não carregada"}
        if series_name not in config.get("series_codes", {}):
            return {"success": False, "error": f"Série {series_name} não encontrada na configuração"}

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
    current_config_path = get_base_path("series_config.yaml")
    try:
        current_config = load_series_config()
        if not current_config:
            current_config = {"database": {"type": "sqlite", "db_name": "dados_bcb.db"}, "series_codes": {}}
    except Exception as e:
        return {"success": False, "error": f"Erro ao carregar configuração atual: {str(e)}"}

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
        return {"success": False, "error": f"Erro ao salvar series_config.yaml: {str(e)}"}

@eel.expose
def get_current_config():
    """
    Retorna a configuração atual do series_config.yaml.
    """
    try:
        return load_series_config()
    except Exception as e:
        return {e}

if __name__ == "__main__":
    # Inicia a interface Eel
    eel.start("index.html", size=(1000, 700))

