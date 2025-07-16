# Coletor de Séries Temporais do Banco Central do Brasil (BCB)

Este projeto implementa uma aplicação Python modular para coletar, processar e armazenar séries temporais do Banco Central do Brasil (BCB) em diferentes tipos de bancos de dados, com foco em flexibilidade e configurabilidade.

## Estrutura do Projeto

```
coletor_bcb/
├── main.py
├── config.yaml
├── requirements.txt
├── modules/
│   ├── __init__.py
│   ├── data_acquirer.py
│   └── data_processor.py
└── persistence/
    ├── __init__.py
    ├── base_adapter.py
    └── sqlite_adapter.py
```

- `main.py`: Ponto de entrada principal da aplicação. Orquestra o fluxo de coleta, processamento e armazenamento de dados.
- `config.yaml`: Arquivo de configuração para definir as séries a serem buscadas e as configurações do banco de dados.
- `requirements.txt`: Lista as dependências Python necessárias para o projeto.
- `modules/data_acquirer.py`: Responsável por buscar os dados da API do BCB, incluindo tratamento para limites de consulta.
- `modules/data_processor.py`: Realiza o pré-processamento dos dados brutos recebidos da API.
- `persistence/base_adapter.py`: Define a interface abstrata para adaptadores de banco de dados, garantindo modularidade.
- `persistence/sqlite_adapter.py`: Implementação do adaptador de banco de dados para SQLite.

## Configuração e Execução

### 1. Pré-requisitos

Certifique-se de ter o Python 3.x instalado em seu sistema.

### 2. Instalação das Dependências

Navegue até o diretório `coletor_bcb` e instale as dependências usando pip:

```bash
pip install -r requirements.txt
```

### 3. Configuração (config.yaml)

O arquivo `config.yaml` permite configurar quais séries serão buscadas e onde serão armazenadas. Exemplo:

```yaml
database:
  type: sqlite
  db_name: dados_bcb.db
series_codes:
  433: ipca_mensal
  1: selic_diaria
```

- `database.type`: Define o tipo de banco de dados (atualmente `sqlite` é suportado).
- `database.db_name`: Nome do arquivo do banco de dados SQLite.
- `series_codes`: Mapeia os códigos das séries do BCB (ex: `433` para IPCA Mensal, `1` para SELIC Diária) para os nomes das tabelas no banco de dados.

### 4. Execução da Aplicação

Para executar a aplicação, navegue até o diretório `coletor_bcb` e execute o script `main.py`:

```bash
python main.py
```

Na primeira execução, o banco de dados SQLite (`dados_bcb.db`) será criado e populado com os dados históricos das séries configuradas. Em execuções subsequentes, a aplicação buscará apenas novos registros, evitando duplicação.

## Modularidade e Extensibilidade

O design modular da aplicação facilita a adição de novas funcionalidades:

- **Novas Séries Temporais**: Basta adicionar o código da série e o nome da tabela desejado no arquivo `config.yaml`.
- **Novos Tipos de Banco de Dados**: Para adicionar suporte a um novo banco de dados (ex: PostgreSQL, MongoDB), crie um novo adaptador na pasta `persistence/` que herde de `base_adapter.py` e implemente seus métodos abstratos. Em seguida, atualize `main.py` para instanciar o novo adaptador com base na configuração em `config.yaml`.

