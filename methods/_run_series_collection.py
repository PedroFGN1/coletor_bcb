import pandas as pd
import yaml
from datetime import datetime
import eel

from modules.data_acquirer_sgs import fetch_bcb_series
from modules.data_processor import process_series_data
from persistence.sqlite_adapter import SQLiteAdapter
from utils.get_base_path import get_base_path
from utils.send_log_to_frontend import send_log_to_frontend

def _run_series_collection():
    """
    Lógica principal de coleta de dados, movida para uma função separada.
    """
    send_log_to_frontend("Iniciando processo de coleta de dados...")
    config = {}
    config_path = get_base_path("series_config.yaml")
    try:
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        send_log_to_frontend(f"Erro: Arquivo series_config.yaml não encontrado em {config_path}.")
        eel.collection_finished()()
        return

    db_config = config.get("database", {})
    db_type = db_config.get("type")
    db_name = db_config.get("db_name")
    
    try:
        if not db_type or not db_name:
            raise ValueError("Configuração do banco de dados inválida. Verifique o arquivo series_config.yaml.")
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
    except Exception as e:
        send_log_to_frontend(f"Erro durante a coleta de dados: {str(e)}")
        eel.collection_finished()()
        return

    finally:
        adapter.disconnect()
        send_log_to_frontend("Processo de coleta de dados finalizado.")
        eel.collection_finished()()

# Teste de execução direta
if __name__ == "__main__":
    _run_series_collection()