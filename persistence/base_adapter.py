from abc import ABC, abstractmethod
import pandas as pd

class DatabaseAdapter(ABC):
    """
    Classe base abstrata para adaptadores de banco de dados.
    Define a interface que todos os adaptadores devem implementar.
    """

    @abstractmethod
    def connect(self):
        """
        Estabelece a conexão com o banco de dados.
        """
        pass

    @abstractmethod
    def disconnect(self):
        """
        Fecha a conexão com o banco de dados.
        """
        pass

    @abstractmethod
    def get_last_date(self, series_name: str) -> pd.Timestamp | None:
        """
        Retorna a última data de registro para uma dada série no banco de dados.
        Retorna None se a tabela não existir ou estiver vazia.
        """
        pass

    @abstractmethod
    def save_data(self, series_name: str, data: pd.DataFrame):
        """
        Salva os dados de uma série no banco de dados.
        """
        pass

    @abstractmethod
    def get_table_names(self) -> list[str]:
        """
        Retorna uma lista com os nomes das tabelas no banco de dados.
        """
        pass

    @abstractmethod
    def fetch_full_table_data(self, table_name: str) -> pd.DataFrame:
        """
        Retorna todos os dados de uma tabela específica como um DataFrame.
        Se a tabela não existir, deve retornar um DataFrame vazio.
        """
        pass
