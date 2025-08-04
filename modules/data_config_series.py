import yaml
from utils.get_base_path import get_base_path

def load_series_config():
    """
    Retorna a configuração atual do series_config.yaml.
    """
    config_path = get_base_path("series_config.yaml")
    try:
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
            return config
    except FileNotFoundError:
        return {"database": {"type": "sqlite", "db_name": "dados_bcb.db"}, "series_codes": {}}