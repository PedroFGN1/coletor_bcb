# Coletor de Séries Temporais do Banco Central do Brasil (BCB)

Este projeto implementa uma aplicação Python modular para coletar, processar e armazenar séries temporais e expectativas de mercado do Banco Central do Brasil (BCB) em diferentes tipos de bancos de dados, com foco em flexibilidade e configurabilidade. A aplicação inclui uma interface web moderna e intuitiva para facilitar a interação do usuário.

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
├── main.py                        # Ponto de entrada principal da aplicação
├── series_config.yaml             # Configuração das séries temporais
├── focus_config.yaml              # Configuração dos endpoints do Boletim Focus
├── requirements.txt               # Dependências Python
├── dados_bcb.db                   # Banco de dados SQLite (gerado automaticamente)
├── README.md                      # Documentação principal
├── Documentação Técnica.md        # Arquitetura, Fluxo de Operação e Guia de Instalação
├── frontend/                      # Interface web
│   ├── index.html                 # Página principal da interface
│   ├── css/
│   │   └── style.css              # Estilos da interface
│   └── js/
│       └── app.js                 # Lógica JavaScript da interface
├── modules/                       # Módulos de negócio e utilitários
│   ├── __init__.py
│   ├── data_acquirer_focus.py     # Aquisição de dados do Boletim Focus
│   ├── data_acquirer_sgs.py       # Aquisição de dados SGS do BCB
│   ├── data_config.py             # Classe utilitária para manipulação de arquivos YAML de configuração
│   ├── data_exporter.py           # Exportação de dados (CSV/Excel)
│   ├── data_processor.py          # Processamento e tratamento de dados
├── persistence/                   # Camada de persistência de dados
│   ├── __init__.py
│   ├── base_adapter.py            # Interface abstrata para adaptadores de banco de dados
│   └── sqlite_adapter.py          # Implementação do adaptador para SQLite
├── utils/                         # Funções utilitárias
│   ├── __init__.py
│   ├── dataframe_format.py        # Funções para formatação de datas e números em DataFrames
│   ├── get_base_path.py           # Função utilitária para caminhos de arquivos
│   └── send_log_to_frontend.py    # Envio de logs para a interface web
├── methods/                       # Métodos principais da aplicação e scripts de coleta
│   ├── __init__.py
│   ├── _run_focus_collection.py   # Script para coleta do Boletim Focus
│   └── _run_series_collection.py  # Script para coleta de séries temporais do SGS
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

### 3. Configuração (series_config.yaml e focus_config.yaml)

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

O arquivo `focus_config.yaml` define os endpoints e parâmetros para coleta do Boletim Focus:

```yaml
database:
  type: sqlite
  db_name: dados_bcb.db

focus_endpoints:
  ExpectativasMercadoAnuais:
    nome_amigavel: "Expectativas de Mercado Anuais"
    descricao_endpoint: "Consulta as projeções anuais para os principais indicadores econômicos."
    parametros:
      Indicador:
        tipo: string
        descricao: "Selecione o indicador econômico desejado."
        opcoes:
          - IPCA
          - Selic
          - PIB Total
          # ... outros indicadores ...
      Data:
        tipo: string
        descricao: "Data da coleta da expectativa."
      Media:
        tipo: number
        descricao: "Média das expectativas dos respondentes."
      # ... outros parâmetros ...
  # ... outros endpoints ...
```

### 4. Execução da Aplicação

Para iniciar a aplicação com interface web:

```bash
python main.py
```

A interface web será aberta automaticamente no navegador padrão. Se isso não acontecer, acesse manualmente: `http://localhost:8000`

### 5. Criação de Executável .exe

Para criar um executável `.exe`, execute este comando no terminal python no diretório raiz da aplicação.

```bash
pyinstaller --noconsole --onefile --icon="assets/icon.ico" --add-data="frontend;frontend" --add-data="series_config.yaml;." --add-data="focus_config.yaml;." --name="ColetorBCB" main.py
```

- `--noconsole`: este comando impede que a janela preta de terminal apareça por trás da janela da aplicação.
- `--onefile`: Cria um único arquivo `.exe`.
- `--icon="assets/icon.ico"`: Associa o ícone ao executável.
- `--add-data="frontend;frontend"`: Comando para aplicações Eel, inclui arquivos HTML, CSS e JS no diretório raiz do executável. 
- `--add-data="{}_config.yaml;."`: Inclui os arquivos de configuração `config.yaml` no diretório raiz do executável.
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

#### Gerenciamento de Séries Temporais

Esta seção permite gerenciar as séries temporais a serem coletadas.
1.  **Adicionar Nova Série**: Para adicionar uma nova série temporal, preencha os campos solicitados e clique em "Adicionar à Lista".
    *   **Código da Série BCB:** Insira o código numérico da série desejada (ex: `20543` para Dólar PTAX).
    *   **Nome Base da Tabela:** Forneça um nome descritivo para a série (ex: `dolar ptax`). O sistema irá gerar automaticamente um nome de tabela sanitizado e com a periodicidade (ex: `dolar_ptax_diaria`).
    *   **Periodicidade:** Selecione a periodicidade da série (Diária, Mensal, Anual).
2.  **Salvar e Validar Configurações**: Clique no botão "Salvar e Validar Configurações" para que o sistema valide as séries com a API do BCB e salve as configurações no `series_config.yaml`.

**Validações Automáticas:**
-   O sistema verifica se o código da série retorna dados válidos da API do BCB.
-   Verifica a consistência entre o nome da tabela e a periodicidade selecionada.
-   Garante a unicidade dos nomes das tabelas para evitar conflitos no banco de dados.

#### Gerenciamento do Boletim Focus

Esta seção permite configurar e personalizar a coleta dos dados do Boletim Focus do Banco Central do Brasil.
1. **Seleção de Endpoint:** Escolha o endpoint desejado do Boletim Focus, conforme definido no arquivo `focus_config.yaml`. Cada endpoint representa um tipo de expectativa de mercado (ex: anual, mensal, Top 5, Selic, inflação, etc).
2. **Filtros Dinâmicos:** Após selecionar o endpoint, os filtros disponíveis (como Indicador, Data de Início, Data de Fim, entre outros) serão exibidos dinamicamente de acordo com a configuração YAML. Preencha os filtros conforme necessário para refinar a consulta.
3. **Iniciar Coleta:** Clique em "Iniciar Coleta Boletim Focus" para coletar os dados conforme os filtros selecionados. O sistema irá buscar os dados diretamente da API do BCB e armazenar no banco de dados.

**Validações Automáticas:**
-   O sistema garante que os campos obrigatórios (como Endpoint e Data de Início) estejam preenchidos.
-   Os filtros disponíveis são carregados automaticamente conforme o endpoint escolhido, evitando erros de configuração.
-   O processo de coleta é registrado nos logs da interface para acompanhamento em tempo real.

### Fluxo de Operação

1. **Primeira Execução**: 
   - O banco de dados será criado automaticamente
   - Todas as séries configuradas serão coletadas desde 1990
   - O processo pode levar alguns minutos dependendo do número de séries

2. **Execuções Subsequentes**:
   - Apenas novos dados serão coletados
   - O processo será mais rápido
   - Duplicatas são automaticamente evitadas

3. **Coleta do Boletim Focus**
  O botão "Iniciar Coleta Boletim Focus" segue as seguintes regras de funcionamento:
    - Só estará habilitado quando todos os campos obrigatórios do formulário do Boletim Focus estiverem preenchidos, especialmente o Endpoint e a Data de Início.
    - Ao ser acionado, o sistema valida os filtros selecionados e inicia a coleta dos dados do endpoint escolhido, conforme os parâmetros definidos no arquivo `focus_config.yaml`.
    - Durante a coleta, o botão fica desabilitado e exibe um indicador de carregamento até o término do processo.
    - Todas as ações, mensagens de validação e o progresso da coleta são exibidos em tempo real na área de logs da interface.

### Monitoramento

A área de logs mostra informações detalhadas sobre:
- Séries sendo processadas
- Data e hora da coleta
- Endpoint do Boletim Focus utilizado
- Filtros selecionados
- Status da coleta
- Quantidade de registros coletados
- Erros ou avisos
- Status de conclusão

## Modularidade e Extensibilidade

### Adicionando Novas Séries

Para adicionar uma nova série temporal:

1. Encontre o código da série no site do BCB
2. Adicione uma entrada no arquivo `series_config.yaml`:
   ```yaml
   series_codes:
     [CÓDIGO]: nome_da_tabela
   ```
3. Execute a aplicação normalmente

- Também é possível utilizar a seção `Configurações` na interface web para adicionar novas séries. O sistema cuidará da **validação** e **persistência**.

### Adicionando Novos Endpoints do Boletim Focus

Para adicionar um novo endpoint do Boletim Focus:

1. Localize a estrutura desejada no arquivo `focus_config.yaml`.
2. Adicione uma nova entrada sob a chave `focus_endpoints` com o nome do endpoint, uma descrição amigável e os parâmetros necessários.
   ```yaml
   focus_endpoints:
     NovoEndpointExemplo:
       nome_amigavel: "Nome Amigável do Endpoint"
       descricao_endpoint: "Descrição do novo endpoint."
       parametros:
         Parametro1:
           tipo: string
           descricao: "Descrição do parâmetro 1."
           opcoes:
             - OpcaoA
             - OpcaoB
         # ... outros parâmetros ...

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