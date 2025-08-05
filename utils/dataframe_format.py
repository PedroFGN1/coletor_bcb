import pandas as pd

def date_format(df: pd.DataFrame) -> pd.DataFrame:
    """
    Formata todas as colunas do DataFrame que são do tipo data/hora para o formato brasileiro (dd/mm/yyyy).
    Retorna uma cópia do DataFrame com as datas formatadas como string.
    """
    df_formatado = df.copy()
    for col in df_formatado.columns:
        if pd.api.types.is_datetime64_any_dtype(df_formatado[col]):
            df_formatado[col] = df_formatado[col].dt.strftime('%d/%m/%Y')
    return df_formatado

def decimal_format(df: pd.DataFrame) -> pd.DataFrame:
    """
    Formata todas as colunas numéricas do DataFrame para o formato brasileiro (vírgula como separador decimal).
    Retorna uma cópia do DataFrame com os números formatados como string.
    """
    df_formatado = df.copy()
    for col in df_formatado.columns:
        if pd.api.types.is_float_dtype(df_formatado[col]) or pd.api.types.is_integer_dtype(df_formatado[col]):
            df_formatado[col] = df_formatado[col].apply(lambda x: f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if pd.notnull(x) else "")
    return df_formatado