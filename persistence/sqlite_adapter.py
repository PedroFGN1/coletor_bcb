from persistence.base_adapter import DatabaseAdapter
from sqlalchemy import create_engine, text, inspect
import pandas as pd

class SQLiteAdapter(DatabaseAdapter):
    """
    Adaptador para banco de dados SQLite.
    """
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.engine = None

    def connect(self):
        self.engine = create_engine(f'sqlite:///{self.db_path}')
        print(f"Conectado ao banco de dados SQLite: {self.db_path}")

    def disconnect(self):
        if self.engine:
            self.engine.dispose()
            print("Conexão SQLite desconectada.")

    def get_last_date(self, series_name: str) -> pd.Timestamp | None:
        if not self.engine:
            raise ConnectionError("Conexão com o banco de dados não estabelecida.")
        
        with self.engine.connect() as connection:
            inspector = inspect(self.engine)
            if series_name not in inspector.get_table_names():
                return None
            
            query = text(f"SELECT MAX(data) FROM {series_name}")
            result = connection.execute(query).scalar_one_or_none()
            
            if result:
                return pd.to_datetime(result)
            return None

    def save_data(self, series_name: str, data: pd.DataFrame):
        if not self.engine:
            raise ConnectionError("Conexão com o banco de dados não estabelecida.")
        
        if data.empty:
            print(f"Nenhum dado para salvar para a série {series_name}.")
            return

        try:
            data.to_sql(series_name, self.engine, if_exists='append', index=False)
            print(f"Dados da série {series_name} salvos com sucesso.")
        except Exception as e:
            print(f"Erro ao salvar dados da série {series_name}: {e}")

    def get_table_names(self) -> list[str]:
        if not self.engine:
            raise ConnectionError("Conexão com o banco de dados não estabelecida.")
        inspector = inspect(self.engine)
        return inspector.get_table_names()

    def fetch_full_table_data(self, table_name: str) -> pd.DataFrame:
        if not self.engine:
            raise ConnectionError("Conexão com o banco de dados não estabelecida.")
        
        with self.engine.connect() as connection:
            query = text(f"SELECT * FROM {table_name}")
            df = pd.read_sql(query, connection)
            return df
        