import pandas as pd
import os
from datetime import datetime

def export_dataframe(df: pd.DataFrame, file_format: str, table_name: str) -> str:
    """
    Exporta um DataFrame para CSV ou Excel.
    
    Args:
        df: DataFrame a ser exportado
        file_format: Formato do arquivo ('csv' ou 'excel')
        table_name: Nome da tabela/série para nomear o arquivo
    
    Returns:
        Caminho completo do arquivo salvo
    """
    # Determinar pasta de Downloads do usuário
    home_dir = os.path.expanduser("~")
    downloads_dir = os.path.join(home_dir, "Downloads")
    sheet_name = f'ColetorBCB_v2.0-{table_name}'
    
    # Se não existir pasta Downloads, usar diretório atual
    if not os.path.exists(downloads_dir):
        downloads_dir = os.getcwd()
    
    # Criar nome do arquivo com timestamp
    timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
    
    df['data'] = pd.to_datetime(df['data']).dt.strftime('%d/%m/%Y')

    if file_format.lower() == 'csv':
        filename = f"dados_{table_name}_{timestamp}.csv"
        filepath = os.path.join(downloads_dir, filename)
        df.to_csv(filepath, index=False, encoding='utf-8')
    elif file_format.lower() == 'excel':
        filename = f"dados_{table_name}_{timestamp}.xlsx"
        filepath = os.path.join(downloads_dir, filename)
        df.to_excel(filepath, sheet_name=sheet_name, index=False, engine='openpyxl')
    else:
        raise ValueError(f"Formato não suportado: {file_format}")
    
    return filepath