import pandas as pd
import yaml
from datetime import datetime
from modules.data_acquirer_sgs import fetch_bcb_series
from modules.data_processor import process_series_data
from persistence.sqlite_adapter import SQLiteAdapter

def main():
    config = {}
    try:
        with open("config.yaml", "r") as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        print("Erro: Arquivo config.yaml não encontrado.")
        return

    db_config = config.get("database", {})
    db_type = db_config.get("type")
    db_name = db_config.get("db_name")

    if db_type == "sqlite":
        adapter = SQLiteAdapter(db_name)
    else:
        print(f"Erro: Tipo de banco de dados '{db_type}' não suportado.")
        return

    adapter.connect()

    try:
        series_codes = config.get("series_codes", {})
        for code, series_name in series_codes.items():
            print(f"\nProcessando série: {series_name} (Código BCB: {code})")
            last_date = adapter.get_last_date(series_name)
            
            start_date = None
            if last_date:
                # Adiciona um dia para buscar a partir do próximo registro
                start_date = last_date + pd.Timedelta(days=1)
                print(f"Última data encontrada para {series_name}: {last_date.strftime('%Y-%m-%d')}. Buscando a partir de {start_date.strftime('%Y-%m-%d')}")
            else:
                start_date = datetime(1990, 1, 1) # Data de início padrão
                print(f'Nenhum registro encontrado no banco de dados para {series_name}. Buscando desde {start_date.strftime("%Y-%m-%d")}')

            raw_data = fetch_bcb_series(code, start_date)
            processed_data = process_series_data(raw_data, code)

            if not processed_data.empty:
                # Filtra dados para garantir que apenas novos registros sejam salvos
                if last_date:
                    processed_data = processed_data[processed_data["data"] > last_date]
                
                if not processed_data.empty:
                    adapter.save_data(series_name, processed_data)
                    print(f"{len(processed_data)} novos registros salvos para {series_name}.")
                else:
                    print(f"Nenhum novo registro para {series_name} desde a última atualização.")
            else:
                print(f"Nenhum dado retornado da API para a série {series_name}.")

    finally:
        adapter.disconnect()

if __name__ == "__main__":
    main()

