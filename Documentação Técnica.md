### **Documentação Técnica – Coletor BCB v2.1**

#### **1\. Visão Geral e Arquitetura**

O Coletor BCB é uma aplicação de desktop desenvolvida em Python com uma interface web (via Eel), projetada para automatizar a coleta, armazenamento, visualização e exportação de séries temporais do Sistema Gerenciador de Séries Temporais (SGS) do Banco Central do Brasil.

A aplicação foi construída sobre uma **arquitetura modular** para garantir a separação de responsabilidades, facilitando a manutenção e futuras expansões.

* **main.py (Controlador/Orquestrador):** É o cérebro da aplicação. Ele não contém lógica de negócio específica (como a forma de buscar dados), mas orquestra o fluxo de operações. É responsável por iniciar a interface, expor as funções do backend para o frontend (via Eel) e coordenar as chamadas entre os diferentes módulos de serviço.  
* **frontend/ (Camada de Apresentação):** Contém todos os arquivos (HTML, CSS, JavaScript) da interface gráfica. É responsável por toda a interação com o usuário, validações de formulário do lado do cliente e pela comunicação com o backend através das funções expostas pelo Eel.  
* **modules/ (Módulos de Serviço):** Contém a lógica de negócio principal, onde cada módulo tem uma responsabilidade única:  
  * data\_acquirer.py: O único módulo que sabe como se comunicar com a API do SGS do BCB.  
  * data\_processor.py: Responsável por limpar, formatar e analisar os dados brutos recebidos.  
  * data\_exporter.py: Encapsula a lógica para exportar dados para diferentes formatos de arquivo (CSV, Excel).  
* **persistence/ (Camada de Persistência):** Abstrai a interação com o banco de dados. Segue o padrão **Adapter**, permitindo que o tipo de banco de dados (atualmente SQLite) possa ser trocado no futuro sem impactar o resto da aplicação.

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
2. **Carregamento:** O frontend solicita e exibe as séries atualmente salvas no config.yaml.  
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
   c. Se todas as validações passarem, o main.py reescreve o arquivo config.yaml de forma segura.  
   d. O frontend recebe uma resposta de sucesso ou erro e exibe uma notificação correspondente.

#### **3\. Guia de Instalação e Execução**

* **Pré-requisitos:** Python 3.11 ou superior.  
* **Instalação:**  
  1. Clone o repositório.  
  2. Navegue até o diretório raiz do projeto.  
  3. Execute pip install \-r requirements.txt para instalar todas as dependências.  
* **Execução (Modo de Desenvolvimento):**  
  * Execute python main.py. A interface será iniciada.  
* **Criação de Executável (.exe):**  
  * Execute o comando: pyinstaller \--noconsole \--onefile \--icon="assets/icon.ico" \--add-data="frontend;frontend" \--add-data="config.yaml;." \--name="ColetorBCB" main.py. O executável será criado no diretório dist/.