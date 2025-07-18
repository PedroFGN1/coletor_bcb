import pandas as pd
import yaml
from datetime import datetime
import eel
import threading
import os
import sys

from modules.data_acquirer import fetch_bcb_series
from modules.data_processor import process_series_data
from persistence.sqlite_adapter import SQLiteAdapter

# Inicializa o Eel
eel.init('frontend')

def get_base_path(path):
    """Retorna o caminho base para encontrar os arquivos de recurso."""
    if getattr(sys, 'frozen', False):
        # Se o programa estiver 'congelado' (rodando como .exe)
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

    if db_type == "sqlite":
        adapter = SQLiteAdapter(db_name)
    else:
        send_log_to_frontend(f"Erro: Tipo de banco de dados \'{db_type}\' não suportado.")
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
                send_log_to_frontend(f"Última data encontrada para {series_name}: {last_date.strftime('%Y-%m-%d')}. Buscando a partir de {start_date.strftime('%Y-%m-%d')}")
            else:
                start_date = datetime(1990, 1, 1)
                send_log_to_frontend(f"Nenhum registro encontrado para {series_name}. Buscando desde {start_date.strftime('%Y-%m-%d')}")

            raw_data = fetch_bcb_series(code, start_date)
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
    eel.start('index.html', size=(1000, 700))

