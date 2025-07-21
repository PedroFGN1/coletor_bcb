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
- **Configuração Dinâmica de Séries**: Adicione, valide e gerencie séries diretamente pela interface web.

## Estrutura do Projeto

```
coletor_bcb/
├── main.py                   # Ponto de entrada principal
├── config.yaml               # Arquivo de configuração
├── requirements.txt          # Dependências Python
├── dados_bcb.db              # Banco de dados SQLite (gerado automaticamente)
├── README.md                 # Esta documentação
├── Relatorio_Detalhado.md    # Relatório técnico detalhado
├── frontend/                 # Interface web
│   ├── index.html            # Página principal
│   ├── css/
│   │   └── style.css         # Estilos da interface
│   └── js/
│       └── app.js            # Lógica JavaScript
├── modules/                  # Módulos de negócio
│   ├── __init__.py
│   ├── data_acquirer.py      # Aquisição de dados da API
│   ├── data_processor.py     # Processamento de dados
│   └── data_exporter.py      # Exportação de dados
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

Navegue até o diretório `coletor_bcb` e instale as dependências. 

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

**A partir da v2.0 Fase 3, a configuração de séries é feita diretamente pela interface web.**

### 4. Execução da Aplicação

Para iniciar a aplicação com interface web:

```bash
python main.py
```

A interface web será aberta automaticamente no navegador padrão. Se isso não acontecer, acesse manualmente: `http://localhost:8000`

### 5. Criação de Executável .exe

Para criar um executável `.exe`, execute este comando no terminal python no diretório raiz da aplicação.

```bash
pyinstaller --noconsole --onefile --icon="assets/icon.ico" --add-data="frontend;frontend" --add-data="config.yaml;." --name="ColetorBCB" main.py
```

- `--noconsole`: este comando impede que a janela preta de terminal apareça por trás da janela da aplicação.
- `--onefile`: Cria um único arquivo `.exe`.
- `--icon="assets/icon.ico"`: Associa o ícone ao executável.
- `--add-data="frontend;frontend"`: Comando para aplicações Eel, inclui arquivos HTML, CSS e JS no diretório raiz do executável. 
- `--add-data="config.yaml;."`: Inclui o arquivo de configuração `config.yaml` no diretório raiz do executável.
- `--name="ColetorBCB"`: Define o nome do arquivo de saída.

## Usando a Interface Web

### Painel de Controle

A interface principal oferece:

1. **Botão "Iniciar Coleta"**: Inicia o processo de coleta de dados
2. **Área de Logs**: Exibe o progresso em tempo real
3. **Botão "Limpar"**: Remove os logs da tela
4. **Indicadores Visuais**: Feedback sobre o status da operação

### Visualizar Dados

Esta seção permite explorar e exportar as séries temporais já coletadas e armazenadas no banco de dados.

1.  **Seleção de Série**: Utilize o dropdown "Série Temporal" para escolher uma das séries disponíveis no seu banco de dados. Ao selecionar, os dados da série serão carregados e exibidos em uma tabela interativa.
2.  **Tabela Interativa**: Os dados são apresentados em uma tabela paginada, com funcionalidades de busca e ordenação, facilitadas pela integração da biblioteca DataTables.js. Isso permite navegar e encontrar informações específicas facilmente, mesmo em séries com muitos registros.
3.  **Botões de Exportação**: Após selecionar uma série e visualizar seus dados, os botões "Exportar CSV" e "Exportar Excel" serão habilitados. Clique no formato desejado para salvar os dados da série em um arquivo na sua pasta de Downloads (ou diretório de trabalho).

### Configurações

Esta seção permite gerenciar as séries temporais a serem coletadas.
1.  **Adicionar Nova Série**: Para adicionar uma nova série temporal, preencha os campos solicitados e clique em "Adicionar à Lista".
    *   **Código da Série BCB:** Insira o código numérico da série desejada (ex: `20543` para Dólar PTAX).
    *   **Nome Base da Tabela:** Forneça um nome descritivo para a série (ex: `dolar ptax`). O sistema irá gerar automaticamente um nome de tabela sanitizado e com a periodicidade (ex: `dolar_ptax_diaria`).
    *   **Periodicidade:** Selecione a periodicidade da série (Diária, Mensal, Anual).
2.  **Salvar e Validar Configurações**: Clique no botão "Salvar e Validar Configurações" para que o sistema valide as séries com a API do BCB e salve as configurações no `config.yaml`.

**Validações Automáticas:**
-   O sistema verifica se o código da série retorna dados válidos da API do BCB.
-   Verifica a consistência entre o nome da tabela e a periodicidade selecionada.
-   Garante a unicidade dos nomes das tabelas para evitar conflitos no banco de dados.

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

- Também é possível utilizar a seção `Configurações` na interface web para adicionar novas séries. O sistema cuidará da **validação** e **persistência**.

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
## 👨‍💻 Autor: Pedro Ferreira Galvão Neto