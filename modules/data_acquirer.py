from bcb import sgs
import pandas as pd
from datetime import datetime, timedelta

def fetch_bcb_series(code, start_date=None):
    """
    Busca dados de uma série temporal do BCB a partir de uma data de início.
    Lida com a limitação de 10 anos para séries diárias.
    """
    all_data = pd.DataFrame()
    current_start_date = start_date if start_date else datetime(1900, 1, 1)

    is_daily_series = (code == 1)

    while True:
        try:
            if is_daily_series:
                end_date_chunk = current_start_date + timedelta(days=365 * 10) - timedelta(days=1)
                if end_date_chunk > datetime.now():
                    end_date_chunk = datetime.now()
                
                print(f'Buscando série {code} de {current_start_date} até {end_date_chunk}')
                df_chunk = sgs.get({"value": code}, start=current_start_date, end=end_date_chunk)
            else:
                print(f'Buscando série {code} a partir de {current_start_date}')
                df_chunk = sgs.get({"value": code}, start=current_start_date)

            if df_chunk.empty:
                break

            all_data = pd.concat([all_data, df_chunk])

            if not is_daily_series or end_date_chunk >= datetime.now():
                break
            
            current_start_date = end_date_chunk + timedelta(days=1)
            if current_start_date > datetime.now():
                break

        except Exception as e:
            print(f"Erro ao buscar série {code}: {e}")
            break

    return all_data

