from bcb import Expectativas, sgs
import pandas as pd
from datetime import datetime, timedelta
from .data_config_focus import load_focus_config

def _build_query_filters(user_params: dict, endpoint_config: dict) -> dict | None:
    """
    Valida e constrói o dicionário de filtros para a API.

    Args:
        user_params (dict): Dicionário com os filtros fornecidos pelo usuário.
        endpoint_config (dict): A seção de configuração do boletim, vinda do YAML.

    Returns:
        Um dicionário com filtros validados ou None se as regras não forem atendidas.
    """
    valid_filters = {}
    available_params = endpoint_config.get('parametros', {})

    for key, value in user_params.items():
        if key in available_params:
            valid_filters[key] = value
        else:
            print(f"AVISO: O filtro '{key}' não é válido para este boletim e será ignorado.")

    # VALIDAÇÃO OBRIGATÓRIA DE FILTROS
    # Garante que 'Data' (data de início) está presente.
    if 'Data' not in valid_filters:
        print("ERRO CRÍTICO: O filtro 'Data' (data de início) é obrigatório.")
        return None

    # Garante que pelo menos um outro filtro foi fornecido para performance.
    if len(valid_filters) <= 1:
        print("ERRO CRÍTICO: Para otimizar a consulta, forneça pelo menos um filtro além da data de início (ex: Indicador, DataReferencia, Reuniao).")
        return None
    
    # Validação do formato da data
    try:
        datetime.strptime(valid_filters['Data'], '%Y-%m-%d')
    except (ValueError, TypeError):
        print("ERRO CRÍTICO: Formato de data inválido para o filtro 'Data'. Use 'YYYY-MM-DD'.")
        return None

    return valid_filters


def _request_focus_data(endpoint_name: str, filters: dict) -> pd.DataFrame | None:
    """
    Executa a requisição à API do BCB com os filtros pré-construídos.

    Args:
        endpoint_name (str): O nome técnico do endpoint a ser consultado.
        filters (dict): Dicionário com os filtros validados.
    
    Returns:
        Um DataFrame do Pandas com os dados retornados, ou None se ocorrer um erro.
    """
    print(f"Executando consulta no endpoint '{endpoint_name}' com os filtros: {filters}")
    try:
        em = Expectativas()
        ep = em.get_endpoint(endpoint_name)

        # Inicia a query
        query = ep.query()

        # Adiciona dinamicamente todos os filtros validados
        for field, value in filters.items():
            # getattr permite acessar o atributo do endpoint dinamicamente (ex: ep.Data, ep.Indicador)
            query = query.filter(getattr(ep, field) >= value)

        # Ordena pela data e coleta os dados
        df = query.orderby(ep.Data.asc()).collect()

        if df.empty:
            print("AVISO: A consulta foi bem-sucedida, mas não retornou dados para os filtros especificados.")
        else:
            print("Consulta finalizada com sucesso. Dados retornados.")
        
        return df

    except Exception as e:
        print(f"ERRO: Falha ao consultar a API do BCB. Detalhes: {e}")
        return None


def fetch_bcb_focus(nome_boletim: str, **kwargs) -> pd.DataFrame | None:
    """
    Orquestra a busca de dados do Boletim Focus de forma otimizada e segura.

    Esta é a função principal a ser chamada por outros módulos.

    Args:
        nome_boletim (str): O nome amigável do boletim (ex: "Expectativas de Mercado Anuais").
        **kwargs: Filtros de consulta (ex: Data="2024-01-01", Indicador="IPCA").
                  'Data' e pelo menos mais um filtro são obrigatórios.

    Returns:
        Um DataFrame do Pandas com os dados solicitados, ou None se ocorrer um erro.
    """
    print(f"\n--- Iniciando processo para o boletim: '{nome_boletim}' ---")
    config_geral = load_focus_config()
    if not config_geral:
        print("ERRO: Configuração do Boletim Focus não foi carregada corretamente.")
        return None

    # 1. Encontrar a configuração do endpoint solicitado
    endpoint_nome_tecnico = None
    endpoint_config_especifica = None
    for key, value in config_geral.items():
        if value.get('nome_amigavel') == nome_boletim:
            endpoint_nome_tecnico = key
            endpoint_config_especifica = value
            break
    
    if not endpoint_nome_tecnico:
        print(f"ERRO: Boletim '{nome_boletim}' não encontrado no arquivo de configuração.")
        return None

    # 2. Construir e validar os filtros
    # O dicionário kwargs contém todos os parâmetros passados (Data="...", Indicador="...")
    filtros_para_api = _build_query_filters(kwargs, endpoint_config_especifica)
    if not filtros_para_api:
        return None  # Encerra se os filtros não atenderem às regras

    # 3. Executar a requisição
    dataframe_resultado = _request_focus_data(endpoint_nome_tecnico, filtros_para_api)

    return dataframe_resultado


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

if __name__ == "__main__":
    # Teste de chamada para todos os endpoints
    print("Iniciando testes de consulta aos endpoints do Boletim Focus...")
    endpoints = load_focus_config() # Obtém todos os nomes amigáveis dos endpoints
    aprovados = []
    reprovados = []
    for endpoint in endpoints:
        print(f"Testando endpoint: {endpoint}")
        df = fetch_bcb_focus(endpoint_name=endpoint, start_date="2025-01-01", config=load_focus_config())
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