### **Documentação Técnica – Coletor BCB v2.1**

#### **1\. Visão Geral e Arquitetura**

O Coletor BCB é uma aplicação de desktop desenvolvida em Python com uma interface web (via Eel), projetada para automatizar a coleta, armazenamento, visualização e exportação de séries temporais e expectativas de mercado do Sistema Gerenciador de Séries Temporais (SGS) e do Boletim Focus do Banco Central do Brasil.

A aplicação foi construída sobre uma **arquitetura modular** para garantir a separação de responsabilidades, facilitando a manutenção e futuras expansões.

* **main.py (Controlador/Orquestrador):** É o cérebro da aplicação. Ele não contém lógica de negócio específica (como a forma de buscar dados), mas orquestra o fluxo de operações. É responsável por iniciar a interface, expor as funções do backend para o frontend (via Eel) e coordenar as chamadas entre os diferentes módulos de serviço.  
* **frontend/ (Camada de Apresentação):** Contém todos os arquivos (HTML, CSS, JavaScript) da interface gráfica. É responsável por toda a interação com o usuário, validações de formulário do lado do cliente e pela comunicação com o backend através das funções expostas pelo Eel.
* **methods/ (Scripts de Execução):** Contém scripts responsáveis por orquestrar os fluxos principais de coleta:
  * _run_focus_collection.py: Script para coleta, processamento e armazenamento dos dados do Boletim Focus.
  * _run_series_collection.py: Script para coleta, processamento e armazenamento das séries temporais SGS.
* **modules/ (Módulos de Serviço):** Contém a lógica de negócio principal, onde cada módulo tem uma responsabilidade única:   
  * data\_acquirer_focus.py: Responsável por buscar dados do Boletim Focus na API do BCB.  
  * data\_acquirer_sgs.py: Responsável por buscar séries temporais do SGS do BCB.  
  * data\_config.py: Classe utilitária para manipulação centralizada dos arquivos de configuração YAML.  
  * data\_exporter.py: Encapsula a lógica para exportar dados para diferentes formatos de arquivo (CSV, Excel).  
  * data\_processor.py: Responsável por limpar, formatar, analisar e inferir periodicidade dos dados brutos recebidos.   
* **persistence/ (Camada de Persistência):** Abstrai a interação com o banco de dados. Segue o padrão **Adapter**, permitindo que o tipo de banco de dados (atualmente SQLite) possa ser trocado no futuro sem impactar o resto da aplicação.
* **utils/ (Funções Utilitárias):** Contém funções auxiliares reutilizáveis em diferentes partes do projeto:
  * dataframe_format.py: Funções para formatação de datas (formato brasileiro) e números decimais (formato nacional) em DataFrames.
  * get_base_path.py: Função utilitária para resolução de caminhos de arquivos, compatível com execução como script ou executável.
  * send_log_to_frontend.py: Função para envio de mensagens de log do backend para a interface web via Eel.

#### **2\. Fluxos de Trabalho Principais**

A aplicação opera através de três fluxos principais iniciados pelo usuário na interface.

##### **2.1. Fluxo de Coleta de Dados**

1. **Início:** O usuário clica em "Iniciar Coleta" no Painel de Controle.  
2. **Orquestração:** main.py inicia um processo em uma thread separada para não bloquear a interface.  
3. **Configuração:** O config.yaml é lido para obter a lista de séries a serem coletadas.  
4. Processamento por Série: Para cada série na configuração:  
   a. O persistence.sqlite\_adapter é consultado para obter a data do último registro salvo.  
   b. O modules.data\_acquirer é invocado para buscar na API do BCB apenas os dados novos, a partir da última data.  
   c. Lógica de Séries Diárias: O data\_acquirer inspeciona o nome da tabela. Se contiver a palavra \_diaria, ele automaticamente ativa a lógica de busca em blocos de 10 anos para contornar a limitação da API.  
   d. O modules.data\_processor limpa e padroniza os dados recebidos.  
   e. O persistence.sqlite\_adapter salva os novos registros no banco de dados.  
5. **Finalização:** A interface é notificada sobre a conclusão do processo.

##### **2.2. Fluxo de Visualização e Exportação**

1. **Navegação:** O usuário acessa a seção "Visualizar Dados".  
2. **Carregamento:** O frontend solicita ao main.py a lista de séries disponíveis, que por sua vez consulta o sqlite\_adapter para obter os nomes das tabelas.  
3. **Seleção:** O usuário seleciona uma série no menu dropdown.  
4. **Exibição:** O frontend solicita os dados completos da série selecionada. O sqlite\_adapter busca os dados, o main.py os formata como JSON e os envia para a interface, onde são renderizados em uma tabela interativa pela biblioteca **DataTables.js**.  
5. **Exportação:** Ao clicar em "Exportar", o frontend envia o nome da série e o formato desejado (csv ou excel) para o main.py. O main.py obtém os dados e invoca o modules.data\_exporter, que formata a coluna de data para o formato AAAA-MM-DD e salva o arquivo na pasta de Downloads do usuário.

##### **2.3. Fluxo de Configuração de Séries**

1. **Navegação:** O usuário acessa a seção "Configurações".  
2. **Carregamento:** O frontend solicita e exibe as séries atualmente salvas no series_config.yaml.  
3. Adição na Interface: O usuário preenche os campos "Código", "Nome Base" e "Periodicidade". O JavaScript executa as seguintes ações:  
   a. Valida se o "Nome Base" não contém palavras de período (diaria, mensal, etc.).  
   b. Sanitiza o texto (minúsculas, substitui espaços por \_).  
   c. Gera o nome final da tabela concatenando o nome base sanitizado com a periodicidade (ex: selic\_metacopom\_diaria).  
   d. Adiciona a nova série à lista visual na tela, com um estilo de destaque.  
4. Validação e Salvamento: O usuário clica em "Salvar e Validar".  
   a. O frontend envia a lista completa de séries (antigas e novas) para a função validate\_and\_save\_configuration no main.py.  
   b. O main.py executa uma validação em três critérios para cada série:  
   i. Existência: Usa o data\_acquirer para buscar uma amostra de dados e confirmar que o código é válido. O intervalo de busca é dinâmico, baseado na periodicidade informada.  
   ii. Periodicidade: Usa o data\_processor.infer\_periodicity para analisar a amostra de dados e verificar se a frequência real corresponde à periodicidade configurada pelo usuário.  
   iii. Unicidade: Garante que não há códigos ou nomes de tabela duplicados na configuração final.  
   c. Se todas as validações passarem, o main.py reescreve o arquivo series_config.yaml de forma segura.  
   d. O frontend recebe uma resposta de sucesso ou erro e exibe uma notificação correspondente.

##### **2.4. Fluxo de Configuração do Boletim Focus**

1. **Navegação:** O usuário acessa a seção "Configurações" e seleciona "Boletim Focus" no seletor de tipo de configuração.
2. **Carregamento:** O frontend solicita e exibe os endpoints e parâmetros disponíveis a partir do arquivo `focus_config.yaml`.
3. **Configuração na Interface:** O usuário seleciona o endpoint desejado (ex: ExpectativasMercadoAnuais) e preenche os filtros dinâmicos exibidos conforme a configuração YAML.
   a. Os filtros disponíveis (como Indicador, Data de Início, Data de Fim, etc.) são gerados dinamicamente de acordo com o endpoint escolhido.
   b. O usuário pode ajustar os valores dos filtros conforme necessário para refinar a consulta.
4. **Validação e Coleta:** O usuário clica em "Iniciar Coleta Boletim Focus".
   a. O frontend valida se todos os campos obrigatórios estão preenchidos.
   b. Os filtros selecionados são enviados ao backend, que executa a coleta dos dados do endpoint escolhido conforme os parâmetros definidos no YAML.
   c. Durante a coleta, o botão fica desabilitado e um indicador de carregamento é exibido.
   d. O progresso, mensagens de validação e status da coleta são exibidos em tempo real na área de logs da interface.
5. **Finalização:** Ao término da coleta, os dados são armazenados no banco de dados e o usuário recebe uma notificação de sucesso ou erro.

**Validações Automáticas:**
- O sistema garante que todos os campos obrigatórios estejam preenchidos antes de iniciar a coleta.
- Os filtros exibidos são sempre consistentes com a configuração YAML do endpoint selecionado.
- O processo de coleta é registrado nos logs para acompanhamento detalhado.

#### **3\. Guia de Instalação e Execução**

* **Pré-requisitos:** Python 3.11 ou superior.  
* **Instalação:**  
  1. Clone o repositório.  
  2. Navegue até o diretório raiz do projeto.  
  3. Execute pip install \-r requirements.txt para instalar todas as dependências.  
* **Execução (Modo de Desenvolvimento):**  
  * Execute python main.py. A interface será iniciada.  
* **Criação de Executável (.exe):**  
  * Execute o comando: pyinstaller \--noconsole \--onefile \--icon="assets/icon.ico" \--add-data="frontend;frontend" \--add-data="series_config.yaml;." \--add-data="focus_config.yaml;." \--name="ColetorBCB" main.py. O executável será criado no diretório dist/.