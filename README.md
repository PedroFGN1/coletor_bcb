# Coletor de Séries Temporais do Banco Central do Brasil (BCB)

Este projeto implementa uma aplicação Python modular para coletar, processar e armazenar séries temporais do Banco Central do Brasil (BCB) em diferentes tipos de bancos de dados, com foco em flexibilidade e configurabilidade. A aplicação inclui uma interface web moderna e intuitiva para facilitar a interação do usuário.

## Características Principais

- **Interface Web Moderna**: Interface gráfica intuitiva com feedback em tempo real
- **Coleta Automatizada**: Busca automática de dados da API do BCB (SGS)
- **Arquitetura Modular**: Separação clara de responsabilidades para fácil manutenção
- **Persistência Flexível**: Suporte para múltiplos tipos de banco de dados
- **Configuração Externa**: Controle completo via arquivo YAML
- **Tratamento Robusto de Erros**: Logging detalhado e recuperação automática
- **Prevenção de Duplicatas**: Sistema inteligente para evitar dados duplicados

## Estrutura do Projeto

```
coletor_bcb/
├── main.py                    # Ponto de entrada principal
├── config.yaml               # Arquivo de configuração
├── requirements.txt           # Dependências Python
├── dados_bcb.db              # Banco de dados SQLite (gerado automaticamente)
├── README.md                 # Esta documentação
├── RELATORIO_IMPLEMENTACAO.md # Relatório técnico detalhado
├── frontend/                 # Interface web
│   ├── index.html            # Página principal
│   ├── css/
│   │   └── style.css         # Estilos da interface
│   └── js/
│       └── app.js            # Lógica JavaScript
├── modules/                  # Módulos de negócio
│   ├── __init__.py
│   ├── data_acquirer.py      # Aquisição de dados da API
│   └── data_processor.py     # Processamento de dados
└── persistence/              # Camada de persistência
    ├── __init__.py
    ├── base_adapter.py       # Interface abstrata
    └── sqlite_adapter.py     # Implementação SQLite
```

## Configuração e Execução

### 1. Pré-requisitos

- Python 3.11 ou superior
- Conexão com a internet para acesso à API do BCB

### 2. Instalação das Dependências

Navegue até o diretório `coletor_bcb` e instale as dependências:

```bash
pip install -r requirements.txt
```

### 3. Configuração (config.yaml)

O arquivo `config.yaml` permite configurar quais séries serão coletadas:

```yaml
database:
  type: sqlite
  db_name: dados_bcb.db
series_codes:
  433: ipca_mensal    # IPCA Mensal
  1: selic_diaria     # SELIC Diária
  11: cambio_dolar    # Taxa de Câmbio USD
```

### 4. Execução da Aplicação

Para iniciar a aplicação com interface web:

```bash
python main.py
```

A interface web será aberta automaticamente no navegador padrão. Se isso não acontecer, acesse manualmente: `http://localhost:8000`

## Usando a Interface Web

### Painel de Controle

A interface principal oferece:

1. **Botão "Iniciar Coleta"**: Inicia o processo de coleta de dados
2. **Área de Logs**: Exibe o progresso em tempo real
3. **Botão "Limpar"**: Remove os logs da tela
4. **Indicadores Visuais**: Feedback sobre o status da operação

### Fluxo de Operação

1. **Primeira Execução**: 
   - O banco de dados será criado automaticamente
   - Todas as séries configuradas serão coletadas desde 1990
   - O processo pode levar alguns minutos dependendo do número de séries

2. **Execuções Subsequentes**:
   - Apenas novos dados serão coletados
   - O processo será mais rápido
   - Duplicatas são automaticamente evitadas

### Monitoramento

A área de logs mostra informações detalhadas sobre:
- Séries sendo processadas
- Quantidade de registros coletados
- Erros ou avisos
- Status de conclusão

## Modularidade e Extensibilidade

### Adicionando Novas Séries

Para adicionar uma nova série temporal:

1. Encontre o código da série no site do BCB
2. Adicione uma entrada no arquivo `config.yaml`:
   ```yaml
   series_codes:
     [CÓDIGO]: nome_da_tabela
   ```
3. Execute a aplicação normalmente

### Adicionando Novos Bancos de Dados

Para suportar um novo tipo de banco:

1. Crie um novo adaptador em `persistence/` herdando de `DatabaseAdapter`
2. Implemente os métodos abstratos: `connect()`, `disconnect()`, `get_last_date()`, `save_data()`
3. Atualize `main.py` para instanciar o novo adaptador

Exemplo de estrutura:
```python
class PostgreSQLAdapter(DatabaseAdapter):
    def connect(self):
        # Implementar conexão PostgreSQL
        pass
    
    def disconnect(self):
        # Implementar desconexão
        pass
    
    # ... outros métodos
```

## Tratamento de Limitações

### Séries Diárias

A API do BCB limita consultas de séries diárias a 10 anos. A aplicação automaticamente:
- Detecta séries diárias (como SELIC)
- Divide consultas em blocos de 10 anos
- Concatena os resultados automaticamente

### Recuperação de Erros

Em caso de falhas temporárias:
- A aplicação tenta reconectar automaticamente
- Logs detalhados ajudam no diagnóstico
- Dados já coletados são preservados

## Solução de Problemas

### Problemas Comuns

**Erro de conexão com a API:**
- Verifique sua conexão com a internet
- A API do BCB pode estar temporariamente indisponível

**Interface não abre:**
- Verifique se a porta 8000 está disponível
- Tente acessar manualmente: `http://localhost:8000`

**Dados não aparecem:**
- Verifique o arquivo `config.yaml`
- Confirme que os códigos das séries estão corretos

### Logs e Diagnóstico

- Logs detalhados são exibidos na interface web
- Logs também aparecem no terminal para diagnóstico técnico
- O arquivo `dados_bcb.db` pode ser inspecionado com ferramentas SQLite

## Licença e Suporte

Este projeto foi desenvolvido como uma ferramenta de código aberto para facilitar o acesso aos dados do Banco Central do Brasil.
# 👨‍💻 Autor: Pedro Ferreira Galvão Neto