document.addEventListener("DOMContentLoaded", function () {
    // Elementos DOM
    const menuItems = document.querySelectorAll(".menu-item");
    const contentSections = document.querySelectorAll(".content-section");
    const startCollectionBtn = document.getElementById("start-collection-btn");
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

    // Estado da aplicação
    let isCollecting = false;
    let dataTable;

    // Inicialização
    setupEventListeners();
    addLog("Sistema inicializado com sucesso.", "info");

    // Configuração dos event listeners
    function setupEventListeners() {
        menuItems.forEach(item => {
            item.addEventListener("click", () => handleMenuClick(item));
        });

        startCollectionBtn.addEventListener("click", handleStartCollection);
        clearLogsBtn.addEventListener("click", handleClearLogs);
        seriesSelect.addEventListener("change", handleSeriesSelectChange);
        exportCsvBtn.addEventListener("click", () => handleExport("csv"));
        exportExcelBtn.addEventListener("click", () => handleExport("excel"));
        addSeriesToListBtn.addEventListener("click", handleAddSeriesToList);
        saveConfigurationsBtn.addEventListener("click", handleSaveConfigurations);

        [baseNameInput, periodicitySelect].forEach(el => {
            el.addEventListener("input", updateGeneratedTableName);
        });
    }

    // --- Lógica de Navegação ---
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
        }
    }

    // --- Lógica do Painel de Controle ---
    function handleStartCollection() {
        if (isCollecting) return;
        setCollectionState(true);
        addLog("Iniciando processo de coleta...", "info");
        eel.start_data_collection();
    }

    function handleClearLogs() {
        logContainer.innerHTML = "";
        addLog("Logs limpos.", "info");
    }

    function setCollectionState(collecting) {
        isCollecting = collecting;
        loadingOverlay.classList.toggle("hidden", !collecting);
        startCollectionBtn.disabled = collecting;
        startCollectionBtn.innerHTML = collecting ? `<i class="fas fa-spinner fa-spin"></i> Coletando...` : `<i class="fas fa-download"></i> Iniciar Coleta`;
    }

    // --- Lógica de Visualização de Dados ---
    async function loadSeriesList() {
        const seriesList = await eel.get_series_list()();
        seriesSelect.innerHTML = "<option value=''>Selecione uma série</option>";
        seriesList.forEach(series => {
            const option = new Option(series, series);
            seriesSelect.add(option);
        });
    }

    async function handleSeriesSelectChange() {
        const seriesName = seriesSelect.value;
        if (!seriesName) {
            if (dataTable) dataTable.clear().draw();
            exportCsvBtn.disabled = true;
            exportExcelBtn.disabled = true;
            return;
        }

        const seriesData = await eel.get_series_data(seriesName)();
        if (dataTable) {
            dataTable.clear();
            dataTable.rows.add(seriesData.map(row => [row.data, row.valor]));
            dataTable.draw();
        } else {
            dataTable = $(dataTableElement).DataTable({
                data: seriesData.map(row => [row.data, row.valor]),
                columns: [{ title: "Data" }, { title: "Valor" }],
                responsive: true,
                language: { url: "//cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json" }
            });
        }
        exportCsvBtn.disabled = false;
        exportExcelBtn.disabled = false;
    }

    async function handleExport(format) {
        const seriesName = seriesSelect.value;
        if (!seriesName) return;

        addLog(`Exportando ${seriesName} para ${format.toUpperCase()}...`, "info");
        const result = await eel.export_series(seriesName, format)();
        if (result.success) {
            addLog(`Arquivo salvo em: ${result.path}`, "success");
        } else {
            addLog(`Erro na exportação: ${result.error}`, "error");
        }
    }

    // --- Lógica de Configurações ---
    async function loadCurrentConfigurations() {
        const config = await eel.get_current_config()();
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

        addSeriesErrorMessage.textContent = "";

        if (!code || !baseName || !periodicity) {
            addSeriesErrorMessage.textContent = "Todos os campos são obrigatórios.";
            return;
        }

        const periodKeywords = ["diaria", "mensal", "anual"];
        if (periodKeywords.some(p => baseName.toLowerCase().includes(p))) {
            addSeriesErrorMessage.textContent = "O Nome Base não deve conter palavras de período.";
            return;
        }

        addSeriesRowToTable(code, generatedName, periodicity, true);
        seriesCodeInput.value = "";
        baseNameInput.value = "";
        periodicitySelect.value = "";
        generatedTableNameInput.value = "";
    }

    function addSeriesRowToTable(code, tableName, periodicity, isNew) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${code}</td>
            <td>${tableName}</td>
            <td>${periodicity}</td>
            <td><button class="btn btn-danger btn-sm remove-series-btn">Remover</button></td>
        `;
        if (isNew) row.classList.add("new-series");

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

        saveConfigMessage.textContent = "Validando e salvando...";
        const result = await eel.validate_and_save_configuration(configData)();

        if (result.success) {
            saveConfigMessage.textContent = "Configurações salvas com sucesso!";
            saveConfigMessage.className = "info-message success";
            setTimeout(() => { saveConfigMessage.textContent = ""; }, 3000);
        } else {
            saveConfigMessage.textContent = `Erro: ${result.error}`;
            saveConfigMessage.className = "info-message error";
        }
    }

    // --- Funções Expostas pelo Eel ---
    eel.expose(add_log);
    function add_log(message, type = "info") {
        const logEntry = document.createElement("div");
        logEntry.className = `log-entry ${type}`;
        const timestamp = new Date().toLocaleTimeString("pt-BR");
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="message">${message}</span>`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    eel.expose(collection_finished);
    function collection_finished() {
        setCollectionState(false);
        addLog("Processo de coleta finalizado.", "info");
        if (document.getElementById("data-view-section").classList.contains("active")) {
            loadSeriesList();
        }
    }
});


