from persistence.base_adapter import DatabaseAdapter
from sqlalchemy import create_engine, text, inspect
import pandas as pd

class SQLiteAdapter(DatabaseAdapter):
    """
    Adaptador de banco de dados para interação com bancos SQLite.

    Esta classe fornece métodos para conectar e desconectar de um banco de dados SQLite,
    recuperar a última data registrada para uma determinada série, salvar DataFrames do pandas
    no banco de dados, listar tabelas disponíveis e buscar todos os dados de uma tabela específica.

    Atributos:
        db_path (str): Caminho para o arquivo do banco de dados SQLite.
        engine (sqlalchemy.engine.Engine | None): Instância do engine SQLAlchemy para conexão com o banco de dados.
    
    Métodos:
        __init__(db_path: str):
            Inicializa o adaptador com o caminho para o banco SQLite.
        connect():
            Estabelece uma conexão com o banco SQLite e inicializa o engine.
        disconnect():
            Encerra o engine do banco e fecha a conexão.
        get_last_date(series_name: str) -> pd.Timestamp | None:
            Retorna a data mais recente (coluna 'data') da tabela especificada (série).
            Retorna None se a tabela não existir ou estiver vazia.
        save_data(series_name: str, data: pd.DataFrame):
            Adiciona o DataFrame fornecido à tabela especificada no banco.
            Cria a tabela se ela não existir.
        get_table_names() -> list[str]:
            Retorna uma lista com todos os nomes de tabelas presentes no banco.
        fetch_full_table_data(table_name: str) -> pd.DataFrame:
            Recupera todas as linhas da tabela especificada como um DataFrame do pandas.
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
        