import yaml
import os
import sys

def get_base_path(path):
    """Retorna o caminho base para encontrar os arquivos de recurso."""
    if getattr(sys, "frozen", False):
        # Se o programa estiver "congelado" (rodando como .exe)
        # o caminho base é o diretório temporário _MEIPASS
        return os.path.join(sys._MEIPASS, path)
    else:
        # Se estiver rodando como script .py normal
        # O caminho base é o diretório onde o script está
        return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), path)

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


# Teste de carregamento da configuração
if __name__ == "__main__":
    config = load_focus_config()
    if config:
        print("Configuração carregada com sucesso:")
        print(config)
    else:
        print("Falha ao carregar a configuração.")