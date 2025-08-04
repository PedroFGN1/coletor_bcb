import pandas as pd
from statistics import mode

def infer_periodicity(df: pd.DataFrame) -> str:
    """
    Analisa um DataFrame de série temporal e infere sua periodicidade
    baseada na diferença entre datas consecutivas.
    
    Args:
        df: DataFrame com coluna 'data' contendo as datas da série
        
    Returns:
        str: "Diária", "Mensal", "Anual" ou "Desconhecida"
    """
    if df.empty or len(df) < 2:
        return "Desconhecida"
    
    # Garantir que a coluna data está em formato datetime
    df_copy = df.copy()
    df_copy['data'] = pd.to_datetime(df_copy['data'])
    
    # Ordenar por data para garantir sequência correta
    df_copy = df_copy.sort_values('data')
    
    # Calcular diferenças em dias entre datas consecutivas
    date_diffs = df_copy['data'].diff().dt.days.dropna()
    
    if date_diffs.empty:
        return "Desconhecida"
    
    try:
        # Calcular a moda (valor mais comum) das diferenças
        most_common_diff = mode(date_diffs)
        
        # Classificar baseado na diferença mais comum
        if most_common_diff == 1:
            return "diaria"
        elif 28 <= most_common_diff <= 31:
            return "mensal"
        elif 365 <= most_common_diff <= 366:
            return "anual"
        else:
            return "Desconhecida"
            
    except Exception:
        # Em caso de erro ou dados inconsistentes
        return "Desconhecida"

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

def focus_processor(df: pd.DataFrame, endpoint: str, filters: dict) -> pd.DataFrame:
    """
    Processa o DataFrame do Boletim Focus, renomeando colunas e aplicando filtros.
    Args:
        df: DataFrame bruto do Boletim Focus
        endpoint: Endpoint da API utilizado para coletar os dados
        filters: Filtros aplicados na coleta dos dados
    Returns:
        pd.DataFrame: DataFrame processado e filtrado
    """
    if df.empty:
        return pd.DataFrame()
    
    # Adicionar coluna de chave única para identificação com id na primeira coluna
    df.insert(0, 'id', range(1, len(df) + 1))
    

    # Retorna DataFrame com coluna id adicionada
    return df