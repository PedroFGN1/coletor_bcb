import pandas as pd

def process_series_data(df, series_code):
    """
    Processa o DataFrame bruto da série temporal.
    Renomeia colunas e garante o formato de data correto.
    """
    if df.empty:
        return pd.DataFrame()

    # A biblioteca python-bcb já retorna o DataFrame com a coluna de data como índice
    # e com o nome 'value' para o valor da série.
    # Vamos resetar o índice para ter 'Date' como uma coluna e renomear 'value' para 'Value'
    df = df.reset_index()
    df.columns = ['data', 'valor']

    # Garante que a coluna 'data' esteja no formato datetime
    df['data'] = pd.to_datetime(df['data'], format= '%Y-%m-%d', errors='coerce')

    return df

