import yaml

def load_focus_config(filepath: str = 'focus_config.yaml') -> dict | None:
    """
    Carrega e retorna o dicionário de configuração do arquivo YAML.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            # Acessa diretamente a chave principal do arquivo
            config = yaml.safe_load(f).get('focus_endpoints', {})
        return config
    except FileNotFoundError:
        print(f"ERRO: Arquivo de configuração '{filepath}' não encontrado.")
        return None
    except Exception as e:
        print(f"ERRO: Falha ao ler ou processar o arquivo YAML. Detalhes: {e}")
        return None




# Teste de carregamento da configuração
if __name__ == "__main__":
    config = load_focus_config()
    if config:
        print("Configuração carregada com sucesso:")
        print(config)
    else:
        print("Falha ao carregar a configuração.")