import pandas as pd
import os
from datetime import datetime

from utils.dataframe_format import date_format as formatar_datas_dataframe

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
    sheet_name = f'ColetorBCB_v2.2-{table_name}'

    # Verificar se o DataFrame está vazio
    if df.empty:
        raise ValueError("O DataFrame está vazio. Não há dados para exportar.")

    # Se não existir pasta Downloads, usar diretório atual
    if not os.path.exists(downloads_dir):
        downloads_dir = os.getcwd()
    
    # Criar nome do arquivo com timestamp
    timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
    
    # Formata colunas genéricas datatime para o formato brasileiro
    df = formatar_datas_dataframe(df)

    if len(sheet_name) > 31:
        sheet_name = sheet_name[:31]

    if file_format.lower() == 'csv':
        filename = f"dados_{table_name}_{timestamp}.csv"
        # Testa se o filename ultrapassa 31 caracteres
        if len(filename) > 31:
            filename = f"dados_{table_name[:20]}_{timestamp}.csv"

        filepath = os.path.join(downloads_dir, filename)
        df.to_csv(filepath, index=False, encoding='utf-8')

    elif file_format.lower() == 'excel':
        filename = f"dados_{table_name}_{timestamp}.xlsx"
        # Testa se o filename ultrapassa 31 caracteres
        if len(filename) > 31:
            filename = f"dados_{table_name[:20]}_{timestamp}.xlsx"

        filepath = os.path.join(downloads_dir, filename)
        df.to_excel(filepath, sheet_name=sheet_name, index=False, engine='openpyxl')

    else:
        raise ValueError(f"Formato não suportado: {file_format} \n Utilize 'csv' ou 'excel'.")
    
    return filepath