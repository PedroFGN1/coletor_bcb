from bcb import sgs
import pandas as pd
from datetime import datetime, timedelta

def fetch_bcb_series(code, start_date=None, end_date=None, table_name=""):
    """
    Busca dados de uma série temporal do BCB a partir de uma data de início.
    Lida com a limitação de 10 anos para séries diárias.
    """
    all_data = pd.DataFrame()
    current_start_date = start_date if start_date else datetime(1900, 1, 1)
    current_end_date = end_date if end_date else datetime.now()

    if "diaria" in table_name:
        # Para séries diárias, buscar em chunks de 10 anos
        is_daily_series = True

    while current_start_date <= current_end_date:
        try:
            if is_daily_series:
                # Para séries diárias, buscar em chunks de 10 anos
                end_date_chunk = current_start_date + timedelta(days=365 * 10) - timedelta(days=1)
                if end_date_chunk > current_end_date:
                    end_date_chunk = current_end_date
                
                print(f'Buscando série {code} de {current_start_date.strftime("%Y-%m-%d")} até {end_date_chunk.strftime("%Y-%m-%d")}')
                df_chunk = sgs.get({"value": code}, start=current_start_date, end=end_date_chunk)
            else:
                # Para outras periodicidades, buscar tudo de uma vez até a data final
                print(f'Buscando série {code} a partir de {current_start_date.strftime("%Y-%m-%d")} até {current_end_date.strftime("%Y-%m-%d")}')
                df_chunk = sgs.get({"value": code}, start=current_start_date, end=current_end_date)

            if df_chunk.empty:
                break

            all_data = pd.concat([all_data, df_chunk])

            if not is_daily_series or end_date_chunk >= current_end_date:
                break
            
            current_start_date = end_date_chunk + timedelta(days=1)

        except Exception as e:
            print(f"Erro ao buscar série {code}: {e}")
            break

    return all_data
