import os
import sys
import yaml
from bcb import Expectativas, sgs
import pandas as pd
from datetime import datetime

def fetch_bcb_focus2(endpoint_name: str, config: dict, start_date: str, indicador: str | None = None) -> pd.DataFrame | None:
    """
    Busca dados do Boletim Focus de forma genérica a partir de uma data de início.

    Esta função utiliza o 'focus_config.yaml' para mapear o nome amigável do
    boletim para o endpoint correto da API do Banco Central.

    Args:
        nome_boletim (str): O nome amigável do boletim (ex: "Expectativas de Mercado Anuais").
        start_date (str): A data de início para a busca, no formato 'YYYY-MM-DD'.
        config (dict): O dicionário de configuração carregado do 'focus_config.yaml'.
        indicador (str | None): O nome do indicador a ser filtrado, se aplicável

    Returns:
        Um DataFrame do Pandas com os dados solicitados, ou None se ocorrer um erro
        ou se nenhum dado for encontrado.
    """
    if not endpoint_name:
        print("ERRO: Nome do boletim não foi fornecido.")
        return None
    if not start_date:
        print("ERRO: Data de início não foi fornecida.")
        return None
    if not config:
        print("ERRO: Configuração não foi carregada corretamente.")
        return None


    print(f"Iniciando processo para o boletim: '{endpoint_name}'")

    # 1. Encontrar o nome técnico do endpoint a partir do nome amigável
    endpoint_nome_tecnico = None
    for key, value in config.items():
        if value.get('nome_amigavel') == endpoint_name:
            endpoint_nome_tecnico = key
            break
        if key.lower() == endpoint_name.lower():
            endpoint_nome_tecnico = key
            break

    if not endpoint_nome_tecnico:
        print(f"ERRO: Boletim '{endpoint_name}' não foi encontrado no arquivo de configuração.")
        return None

    # 2. Validação simples do formato da data
    try:
        datetime.strptime(start_date, '%Y-%m-%d')
    except ValueError:
        print("ERRO: Formato de data inválido. Por favor, use 'YYYY-MM-DD'.")
        return None

    # 3. Consultar a API do Banco Central
    print(f"Consultando endpoint '{endpoint_nome_tecnico}' para dados a partir de {start_date}...")
    try:
        em = Expectativas()
        ep = em.get_endpoint(endpoint_nome_tecnico)

        # Constrói a query, filtra pela data de início, ordena e coleta os dados
        df = ep.query().filter(ep.Data >= start_date).orderby(ep.Data.asc()).collect()

        if df.empty:
            print("AVISO: A consulta foi bem-sucedida, mas não retornou dados para o período solicitado.")
            return df # Retorna o DataFrame vazio para o outro módulo tratar

        print("Consulta finalizada com sucesso. Dados retornados.")
        return df

    except Exception as e:
        print(f"ERRO: Falha ao consultar a API do BCB. Detalhes: {e}")
        return None

def get_base_path(path):
    """Retorna o caminho base para encontrar os arquivos de recurso."""
    if getattr(sys, "frozen", False):
        # Se o programa estiver "congelado" (rodando como .exe)
        # o caminho base é o diretório temporário _MEIPASS
        return os.path.join(sys._MEIPASS, path)
    else:
        # Se estiver rodando como script .py normal
        # O caminho base é o diretório do script principal
        base_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
        return os.path.join(base_dir, path)

def load_focus_config():
    """
    Carrega a configuração do Boletim Focus a partir do arquivo focus_config.yaml.
    
    Returns:
        dict: Dicionário com a configuração dos endpoints do Focus, ou None se houver erro.
    """
    config_path = get_base_path("focus_config.yaml")
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
            
        # Retorna apenas a seção focus_endpoints
        return config.get("focus_endpoints", {})
        
    except FileNotFoundError:
        print(f"ERRO: Arquivo focus_config.yaml não encontrado em {config_path}")
        return None
    except yaml.YAMLError as e:
        print(f"ERRO: Erro ao ler o arquivo focus_config.yaml: {e}")
        return None
    except Exception as e:
        print(f"ERRO: Erro inesperado ao carregar configuração: {e}")
        return None


endpoint_mapping = {
            "ExpectativasMercadoAnuais": "Expectativas de Mercado Anuais",
            "ExpectativaMercadoMensais": "Expectativas de Mercado Mensais",
            "ExpectativasMercadoTrimestrais": "Expectativas de Mercado Trimestrais",
            "ExpectativasMercadoTop5Anuais": "Expectativas de Mercado Top 5 Anuais",
            "ExpectativasMercadoTop5Mensais": "Expectativas de Mercado Top 5 Mensais",
            "ExpectativasMercadoSelic": "Expectativas de Mercado Selic",
            "ExpectativasMercadoInflacao12Meses": "Expectativas de Mercado para Inflação 12 meses",
            "ExpectativasMercadoInflacao24Meses": "Expectativas de Mercado para Inflação 13 a 24 meses",
            "ExpectativasMercadoTop5Selic": "Expectativas de Mercado Selic Top 5"
        }
print("Iniciando testes de consulta aos endpoints do Boletim Focus...")
endpoints = endpoint_mapping # Obtém todos os nomes amigáveis dos endpoints
aprovados = []
reprovados = []
for endpoint in endpoints:
        print(f"Testando endpoint: {endpoint}")
        df = fetch_bcb_focus2(endpoint_name=endpoint, start_date="2025-01-01", config=load_focus_config())
        if df is not None:
            print(f"Dados retornados para o endpoint '{endpoint}' '{df.shape}':")
            print(df.head())
            aprovados.append(endpoint)
        else:
            print(f"Nenhum dado retornado para o endpoint '{endpoint}'.")
            reprovados.append(endpoint)
print("\nTestes concluídos.")
print(f"Endpoints aprovados: {aprovados}")
print(f"Endpoints reprovados: {reprovados}")