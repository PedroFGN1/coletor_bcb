import yaml
from utils.get_base_path import get_base_path

class ConfigManager:
    """
    Classe utilitária para centralizar o acesso e manipulação de arquivos de configuração YAML.

    Exemplo de uso:
    from modules.config_manager import ConfigManager
    series_config = ConfigManager.load_series_config()
    """

    @staticmethod
    def load_series_config():
        """
        Retorna a configuração atual do series_config.yaml.
        Returns:
            dict: Dicionário com a configuração atual ou os valores padrão se o arquivo não existir.
        """
        config_path = get_base_path("series_config.yaml")
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f)
                return config
        except FileNotFoundError:
            return {"database": {"type": "sqlite", "db_name": "dados_bcb.db"}, "series_codes": {}}

    @staticmethod
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
