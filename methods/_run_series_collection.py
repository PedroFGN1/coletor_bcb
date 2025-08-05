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
    Executa o processo principal de coleta de séries temporais do Banco Central do Brasil (BCB).
    Este método realiza as seguintes etapas:
    1. Envia log de início do processo para o frontend.
    2. Carrega as configurações a partir do arquivo 'series_config.yaml'.
    3. Inicializa o adaptador de banco de dados conforme especificado na configuração.
    4. Para cada série definida na configuração:
        - Obtém a última data registrada no banco de dados.
        - Define a data de início para a coleta (após a última data ou desde 01/01/1990).
        - Busca os dados da série via API do BCB.
        - Processa e filtra os dados para evitar duplicidades.
        - Salva novos registros no banco de dados.
        - Envia logs detalhados para o frontend sobre o progresso e resultados.
    5. Trata e reporta erros de configuração, conexão e coleta.
    6. Encerra a conexão com o banco de dados e sinaliza o término do processo ao frontend.
    Exceções:
        - FileNotFoundError: Caso o arquivo de configuração não seja encontrado.
        - ValueError: Caso a configuração do banco de dados seja inválida.
        - Exception: Para outros erros durante a configuração, coleta ou processamento dos dados.
    Observação:
        Esta função depende de funções auxiliares e classes externas, como:
        - send_log_to_frontend
        - get_base_path
        - yaml.safe_load
        - SQLiteAdapter
        - fetch_bcb_series
        - process_series_data
        - eel.collection_finished
        - pandas (pd)
        - datetime
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