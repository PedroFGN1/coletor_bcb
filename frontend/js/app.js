document.addEventListener("DOMContentLoaded", function () {
    // ===================================================================
    // ELEMENTOS DOM
    // ===================================================================
    const menuItems = document.querySelectorAll(".menu-item");
    const contentSections = document.querySelectorAll(".content-section");
    const startCollectionBtn = document.getElementById("start-collection-btn");
    const startFocusCollectionBtn = document.getElementById("start-focus-collection-btn");
    const clearLogsBtn = document.getElementById("clear-logs-btn");
    const logContainer = document.getElementById("log-container");
    const loadingOverlay = document.getElementById("loading-overlay");
    const seriesSelect = document.getElementById("series-select");
    const exportCsvBtn = document.getElementById("export-csv-btn");
    const exportExcelBtn = document.getElementById("export-excel-btn");
    const dataTableElement = document.getElementById("data-table");
    const configuredSeriesTableBody = document.querySelector("#configured-series-table tbody");
    const addSeriesToListBtn = document.getElementById("add-series-to-list-btn");
    const saveConfigurationsBtn = document.getElementById("save-configurations-btn");
    const seriesCodeInput = document.getElementById("series-code-input");
    const baseNameInput = document.getElementById("base-name-input");
    const periodicitySelect = document.getElementById("periodicity-select");
    const generatedTableNameInput = document.getElementById("generated-table-name");
    const addSeriesErrorMessage = document.getElementById("add-series-error-message");
    const saveConfigMessage = document.getElementById("save-config-message");
    const configTypeSelect = document.getElementById("config-type-select");
    const seriesTemporaisConfig = document.getElementById("series-temporais-config");
    const boletimFocusConfig = document.getElementById("boletim-focus-config");
    const saveFocusMessage = document.getElementById("save-focus-message");
    // O botão de salvar do Focus foi removido do HTML, mas mantemos a variável para mensagens
    // const saveFocusConfigBtn = document.getElementById("save-focus-config-btn");


    // ===================================================================
    // ESTADO DA APLICAÇÃO
    // ===================================================================
    let isCollecting = false;
    let dataTable;
    // <<< ALTERAÇÃO >>>: Variável para armazenar a configuração do Focus vinda do YAML.
    let focusConfigData = null;


    // ===================================================================
    // INICIALIZAÇÃO E EVENT LISTENERS
    // ===================================================================
    setupEventListeners();
    addLog("Sistema inicializado com sucesso.", "info");

    function setupEventListeners() {
        menuItems.forEach(item => {
            item.addEventListener("click", () => handleMenuClick(item));
        });

        startCollectionBtn.addEventListener("click", handleStartCollection);
        startFocusCollectionBtn.addEventListener("click", handleStartFocusCollection);
        clearLogsBtn.addEventListener("click", handleClearLogs);
        seriesSelect.addEventListener("change", handleSeriesSelectChange);
        exportCsvBtn.addEventListener("click", () => handleExport("csv"));
        exportExcelBtn.addEventListener("click", () => handleExport("excel"));
        addSeriesToListBtn.addEventListener("click", handleAddSeriesToList);
        saveConfigurationsBtn.addEventListener("click", handleSaveConfigurations);
        configTypeSelect.addEventListener("change", handleConfigTypeChange);

        [baseNameInput, periodicitySelect].forEach(el => {
            el.addEventListener("input", updateGeneratedTableName);
        });
    }

    // Função auxiliar para exibir mensagens
    function displayMessage(element, message, type) {
        element.textContent = message;
        element.className = `message-feedback visible ${type}`; // Adicionei uma classe genérica
        
        if (type === 'success') {
            setTimeout(() => {
                element.classList.remove('visible');
            }, 5000);
        }
    }


    // ===================================================================
    // LÓGICA DE NAVEGAÇÃO
    // ===================================================================
    function handleMenuClick(clickedItem) {
        menuItems.forEach(item => item.classList.remove("active"));
        clickedItem.classList.add("active");

        const sectionId = clickedItem.dataset.section;
        contentSections.forEach(section => {
            section.classList.toggle("active", section.id === sectionId);
        });

        if (sectionId === "data-view-section") {
            loadSeriesList();
        } else if (sectionId === "settings-section") {
            loadCurrentConfigurations();
            handleConfigTypeChange();
        }
    }


    // ===================================================================
    // LÓGICA DO PAINEL DE CONTROLE
    // ===================================================================
    function handleStartCollection() {
        if (isCollecting) return;
        setCollectionState(true, 'series');
        addLog("Iniciando processo de coleta de Séries Temporais...", "info");
        eel.start_data_collection();
    }

    function handleStartFocusCollection() {
        if (isCollecting) return;
        
        // <<< ALTERAÇÃO >>>: A função getFocusConfigFromForm agora tem toda a lógica nova.
        const focusConfig = getFocusConfigFromForm();
        if (!focusConfig) {
            // A própria função getFocusConfigFromForm agora exibe o log de erro.
            return;
        }
        
        setCollectionState(true, 'focus');
        addLog("Iniciando processo de coleta do Boletim Focus...", "info");
        addLog(`Endpoint selecionado: ${focusConfig.endpoint}`, "info");
        addLog(`Filtros aplicados: ${JSON.stringify(focusConfig.filters)}`, "info");
        
        eel.start_focus_collection(focusConfig.endpoint, focusConfig.filters);
    }

    function handleClearLogs() {
        logContainer.innerHTML = "";
        addLog("Logs limpos.", "info");
    }

    function setCollectionState(collecting, type = 'series') {
        isCollecting = collecting;
        loadingOverlay.classList.toggle("hidden", !collecting);
        if (type === 'series') {
            startCollectionBtn.disabled = collecting;
            startCollectionBtn.innerHTML = collecting ? `<i class="fas fa-spinner fa-spin"></i> Coletando...` : `<i class="fas fa-download"></i> Iniciar Coleta Séries Temporais`;
        } else if (type === 'focus') {
            startFocusCollectionBtn.disabled = collecting;
            startFocusCollectionBtn.innerHTML = collecting ? `<i class="fas fa-spinner fa-spin"></i> Coletando...` : `<i class="fas fa-chart-line"></i> Iniciar Coleta Boletim Focus`;
        }
    }


    // ===================================================================
    // LÓGICA DE VISUALIZAÇÃO DE DADOS (SÉRIES TEMPORAIS)
    // ===================================================================
    async function loadSeriesList() {
        const seriesList = await eel.get_series_list()();
        seriesSelect.innerHTML = "<option value=''>Selecione uma Tabela</option>";
        seriesList.forEach(series => {
            const option = new Option(series, series);
            seriesSelect.add(option);
        });
    }

    async function handleSeriesSelectChange() {
        const seriesName = seriesSelect.value;

        // Passo 1: Limpar a tabela e desabilitar botões se nada for selecionado.
        if (!seriesName) {
            if (dataTable) {
                dataTable.destroy();
                dataTable = null;
                dataTableElement.innerHTML = ''; // Limpa completamente a estrutura da tabela
            }
            exportCsvBtn.disabled = true;
            exportExcelBtn.disabled = true;
            return;
        }

        // Passo 2: Buscar os dados do backend PRIMEIRO.
        const seriesData = await eel.get_series_data(seriesName)();

        // Se a tabela já existir (de uma seleção anterior), destruí-la.
        if (dataTable) {
            dataTable.destroy();
            dataTableElement.innerHTML = '';
        }

        // Passo 3: AGORA SIM, verificar se os dados retornados são válidos.
        if (!seriesData || seriesData.length === 0) {
            addLog(`A tabela '${seriesName}' está vazia ou não retornou dados.`, 'warning');
            exportCsvBtn.disabled = true;
            exportExcelBtn.disabled = true;
            return;
        }

        // Passo 4: Construir as colunas e os dados dinamicamente.
        const columns = Object.keys(seriesData[0]).map(key => ({
            title: key,
            data: key
        }));

        const data = seriesData;

        // Passo 5: Inicializar o DataTable com a nova estrutura.
        dataTable = $(dataTableElement).DataTable({
            data: data,
            columns: columns,
            responsive: true,
            destroy: true,
            language: {
                url: "//cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json"
            }
        });

        // Passo 6: Habilitar os botões de exportação.
        exportCsvBtn.disabled = false;
        exportExcelBtn.disabled = false;
    }

    async function handleExport(format) {
        const seriesName = seriesSelect.value;
        if (!seriesName) return;
        try {
            addLog(`Exportando ${seriesName} para ${format.toUpperCase()}...`, "info");
            const result = await eel.export_series(seriesName, format)();
            if (result.success) {
                addLog(`Arquivo salvo em: ${result.path}`, "info");
                alert(`Arquivo salvo em: ${result.path}`);
            } else {
                addLog(`Erro na exportação: ${result.error}`, "error");
                alert(`Erro na exportação: ${result.error}`);
            }
        } catch (error) {
            addLog(`Erro ao exportar: ${error.message}`, "error");
            alert(`Erro ao exportar: ${error.message}`);
        }
    }


    // ===================================================================
    // LÓGICA DE CONFIGURAÇÕES (SÉRIES TEMPORAIS)
    // ===================================================================
    async function loadCurrentConfigurations() {
        const config = await eel.get_series_config()();
        configuredSeriesTableBody.innerHTML = "";
        if (config && config.series_codes) {
            for (const [code, name] of Object.entries(config.series_codes)) {
                const periodicity = name.split("_").pop();
                addSeriesRowToTable(code, name, periodicity, false);
            }
        }
    }

    function handleAddSeriesToList() {
        const code = seriesCodeInput.value;
        const baseName = baseNameInput.value;
        const periodicity = periodicitySelect.value;
        const generatedName = generatedTableNameInput.value;

        addSeriesErrorMessage.classList.remove('visible');

        if (!code || !baseName || !periodicity) {
            displayMessage(addSeriesErrorMessage, "Todos os campos são obrigatórios.", "error");
            return;
        }

        const periodKeywords = ["diaria", "mensal", "anual"];
        if (periodKeywords.some(p => baseName.toLowerCase().includes(p))) {
            displayMessage(addSeriesErrorMessage, "O Nome Base não deve conter palavras de período.", "error");
            return;
        }

        addSeriesRowToTable(code, generatedName, periodicity, true);
        seriesCodeInput.value = "";
        baseNameInput.value = "";
        periodicitySelect.value = "";
        generatedTableNameInput.value = "";
        
        displayMessage(addSeriesErrorMessage, "Série adicionada com sucesso!", "success");
    }

    function addSeriesRowToTable(code, tableName, periodicity, isNew) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="text-center">${code}</td>
            <td class="text-center">${tableName}</td>
            <td class="text-center">${periodicity}</td>
            <td class="text-center"><button class="btn btn-danger btn-sm remove-series-btn">Remover</button></td>
        `;
        
        if (isNew) {
            row.classList.add("new-series-row");
        }

        row.querySelector(".remove-series-btn").addEventListener("click", () => {
            row.remove();
        });

        configuredSeriesTableBody.appendChild(row);
    }

    function updateGeneratedTableName() {
        const baseName = baseNameInput.value;
        const periodicity = periodicitySelect.value;

        if (!baseName || !periodicity) {
            generatedTableNameInput.value = "";
            return;
        }

        const sanitizedBase = baseName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        generatedTableNameInput.value = `${sanitizedBase}_${periodicity.toLowerCase()}`;
    }

    async function handleSaveConfigurations() {
        const rows = configuredSeriesTableBody.querySelectorAll("tr");
        const configData = { series: [] };

        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            configData.series.push({
                code: cells[0].textContent,
                table_name: cells[1].textContent,
                periodicidade: cells[2].textContent
            });
        });

        saveConfigMessage.classList.remove('visible');
        displayMessage(saveConfigMessage, "Validando e salvando...", "info");
        
        const result = await eel.validate_and_save_configuration(configData)();

        if (result.success) {
            displayMessage(saveConfigMessage, "Configurações salvas com sucesso!", "success");
            
            const newSeriesRows = configuredSeriesTableBody.querySelectorAll(".new-series-row");
            newSeriesRows.forEach(row => {
                row.classList.remove("new-series-row");
            });
        } else {
            displayMessage(saveConfigMessage, `Erro: ${result.error}`, "error");
        }
    }


    // ===================================================================
    // <<< INÍCIO DA NOVA LÓGICA PARA CONFIGURAÇÕES DO BOLETIM FOCUS >>>
    // ===================================================================

    async function handleConfigTypeChange() {
        const selectedType = configTypeSelect.value;
        
        seriesTemporaisConfig.style.display = "none";
        boletimFocusConfig.style.display = "none";

        if (selectedType === "series-temporais") {
            seriesTemporaisConfig.style.display = "block";
        } else if (selectedType === "boletim-focus") {
            boletimFocusConfig.style.display = "block";
            // Carrega a configuração do YAML apenas na primeira vez que o usuário clica.
            if (!focusConfigData) {
                await loadAndStoreFocusConfig();
            }
        }
    }
    
    // >>> NOVA FUNÇÃO <<<
    // Chama o backend, pega os dados do YAML e guarda na variável `focusConfigData`.
    async function loadAndStoreFocusConfig() {
        addLog("Carregando configurações do Boletim Focus do backend...", "info");
        const config = await eel.get_focus_config()(); // Chama a nova função Python

        if (config && Object.keys(config).length > 0) {
            focusConfigData = config; // Armazena os dados
            addLog("Configurações do Focus carregadas com sucesso.", "info");
            renderFocusForm(); // Chama a função para renderizar o formulário inicial
        } else {
            addLog("ERRO: Não foi possível carregar as configurações do Focus. Verifique o arquivo focus_config.yaml e os logs do backend.", "error");
            document.getElementById("focus-filters-container").innerHTML = 
                `<div class="error-message">Falha ao carregar configurações. Verifique o arquivo <code>focus_config.yaml</code> e o console.</div>`;
        }
    }

    // >>> NOVA FUNÇÃO <<<
    // Cria o esqueleto do formulário do Focus com o seletor de endpoints.
    function renderFocusForm() {
        const container = document.getElementById("focus-filters-container");
        container.innerHTML = `
            <div class="form-group">
                <label for="focus-endpoint-select">Endpoint do Focus:</label>
                <select id="focus-endpoint-select" class="form-control">
                    <option value="">Selecione um endpoint</option>
                    ${
                        // Popula o select de endpoints dinamicamente
                        Object.keys(focusConfigData).map(key => 
                            `<option value="${key}">${focusConfigData[key].nome_amigavel}</option>`
                        ).join('')
                    }
                </select>
            </div>
            <div id="dynamic-filters-container">
                <p class="text-muted">Selecione um endpoint para ver os filtros disponíveis.</p>
            </div>
            <div class="form-group">
                <label for="focus-data-inicio-input">Data de Início (obrigatório):</label>
                <input type="date" id="focus-data-inicio-input" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="focus-data-fim-input">Data de Fim (opcional):</label>
                <input type="date" id="focus-data-fim-input" class="form-control">
            </div>
        `;
        
        // Adiciona o event listener para quando o usuário trocar o endpoint.
        document.getElementById("focus-endpoint-select").addEventListener("change", renderDynamicFilters);
    }
    
    // <<< FUNÇÃO MODIFICADA >>>
    // Antiga `loadDynamicFilters`, agora renderiza os filtros a partir do `focusConfigData`.
    function renderDynamicFilters() {
        const selectedEndpointKey = document.getElementById("focus-endpoint-select").value;
        const dynamicContainer = document.getElementById("dynamic-filters-container");

        if (!selectedEndpointKey) {
            dynamicContainer.innerHTML = '<p class="text-muted">Selecione um endpoint para ver os filtros disponíveis.</p>';
            return;
        }

        const endpointConfig = focusConfigData[selectedEndpointKey];
        let filtersHTML = '';
        
        // Lista de parâmetros que são dados de RETORNO e não devem virar filtros.
        const nonFilterParams = ['Data', 'Media', 'Mediana', 'DesvioPadrao', 'Minimo', 'Maximo', 'numeroRespondentes', 'baseCalculo', 'coeficienteVariacao'];

        // Itera sobre os parâmetros definidos no YAML para o endpoint selecionado.
        if (endpointConfig && endpointConfig.parametros) {
            for (const paramKey in endpointConfig.parametros) {
                // Pula os parâmetros que não são filtros de entrada.
                if (nonFilterParams.includes(paramKey)) {
                    continue;
                }

                const paramConfig = endpointConfig.parametros[paramKey];
                filtersHTML += '<div class="form-group">';
                filtersHTML += `<label for="filter-${paramKey}">${paramConfig.descricao}</label>`;

                // Se o parâmetro tiver `opcoes`, cria um <select>.
                if (paramConfig.opcoes && paramConfig.opcoes.length > 0) {
                    filtersHTML += `<select id="filter-${paramKey}" name="${paramKey}" class="form-control">`;
                    filtersHTML += '<option value="">Selecione uma opção</option>';
                    paramConfig.opcoes.forEach(opt => {
                        filtersHTML += `<option value="${opt}">${opt}</option>`;
                    });
                    filtersHTML += '</select>';
                } else {
                    // Senão, cria um <input>.
                    const inputType = paramConfig.tipo === 'number' ? 'number' : 'text';
                    filtersHTML += `<input type="${inputType}" id="filter-${paramKey}" name="${paramKey}" class="form-control" placeholder="${paramConfig.descricao}">`;
                }
                filtersHTML += '</div>';
            }
        }

        dynamicContainer.innerHTML = filtersHTML || '<p class="text-muted">Nenhum filtro configurável para este endpoint.</p>';
    }

    // <<< FUNÇÃO MODIFICADA >>>
    // Lê os dados do formulário dinâmico para enviar ao backend.
    function getFocusConfigFromForm() {
        const endpoint = document.getElementById("focus-endpoint-select")?.value;
        const dataInicio = document.getElementById("focus-data-inicio-input")?.value;

        if (!endpoint || !dataInicio) {
            addLog("Erro: Endpoint e Data de Início são obrigatórios para a coleta do Focus.", "error");
            return null;
        }

        const filters = {
            Data: dataInicio,
            DataFim: document.getElementById("focus-data-fim-input")?.value || undefined
        };
        
        // Pega os valores dos filtros que foram criados dinamicamente
        const dynamicContainer = document.getElementById("dynamic-filters-container");
        const dynamicInputs = dynamicContainer.querySelectorAll("input, select");
        
        dynamicInputs.forEach(input => {
            // Adiciona ao objeto de filtros somente se tiver um valor
            if (input.value) {
                filters[input.name] = input.value;
            }
        });

        // Remove o DataFim se for undefined para não enviar um campo vazio
        if (filters.DataFim === undefined) {
            delete filters.DataFim;
        }

        return {
            endpoint: endpoint,
            filters: filters
        };
    }
    
    // ===================================================================
    // <<< FIM DA NOVA LÓGICA >>>
    // ===================================================================


    // ===================================================================
    // FUNÇÕES DE LOG E GLOBAIS
    // ===================================================================
    eel.expose(add_log);
    function add_log(message, type = 'info') {
        addLog(message, type);
    }

    function addLog(message, type = "info") {
        const logEntry = document.createElement("div");
        logEntry.className = `log-entry ${type}`;
        const timestamp = new Date().toLocaleTimeString("pt-BR");
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="message">${message}</span>`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        logEntry.style.opacity = '0';
        requestAnimationFrame(() => {
            logEntry.style.transition = 'opacity 0.5s ease';
            logEntry.style.opacity = '1';
        });
    }

    eel.expose(collection_finished);
    function collection_finished(type) {
        if (type === 'focus') {
            setCollectionState(false, 'focus');
        } else {
            setCollectionState(false, 'series');
        }
        
        addLog("Processo de coleta finalizado.", "info");
        if (document.getElementById("data-view-section").classList.contains("active")) {
            loadSeriesList();
        }
    }

    window.addEventListener('beforeunload', function(e) {
        if (isCollecting) {
            const confirmationMessage = 'Uma coleta está em andamento. Tem certeza que deseja sair?';
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });

    window.addEventListener('error', function(e) {
        addLog(`Erro não tratado na interface: ${e.message}`, 'error');
    });

});
