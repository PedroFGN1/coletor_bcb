// Elementos DOM
const startCollectionBtn = document.getElementById("start-collection-btn");
const clearLogsBtn = document.getElementById("clear-logs-btn");
const logContainer = document.getElementById("log-container");
const loadingOverlay = document.getElementById("loading-overlay");

const seriesSelect = document.getElementById("series-select");
const exportCsvBtn = document.getElementById("export-csv-btn");
const exportExcelBtn = document.getElementById("export-excel-btn");

// Elementos de navegação
const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
const contentSections = document.querySelectorAll(".main-content .content-section");

// Estado da aplicação
let isCollecting = false;
let currentDataTable = null; // Para a instância do DataTables
let currentSeriesName = null;

// Inicialização
document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners();
    addLog("Sistema inicializado com sucesso.", "info");
    loadSeriesList(); // Carrega a lista de séries ao iniciar
});

// Configuração dos event listeners
function setupEventListeners() {
    startCollectionBtn.addEventListener("click", handleStartCollection);
    clearLogsBtn.addEventListener("click", handleClearLogs);
    seriesSelect.addEventListener("change", handleSeriesSelectChange);
    exportCsvBtn.addEventListener("click", () => handleExport("csv"));
    exportExcelBtn.addEventListener("click", () => handleExport("excel"));

    menuItems.forEach(item => {
        item.addEventListener("click", handleMenuItemClick);
    });
}

// Manipulador do botão de iniciar coleta
function handleStartCollection() {
    if (isCollecting) return;
    
    setCollectionState(true);
    addLog("Iniciando processo de coleta...", "info");
    
    // Chama a função Python através do Eel
    eel.start_data_collection();
}

// Manipulador do botão de limpar logs
function handleClearLogs() {
    logContainer.innerHTML = "";
    addLog("Logs limpos.", "info");
}

// Gerencia o estado da coleta
function setCollectionState(collecting) {
    isCollecting = collecting;
    
    if (collecting) {
        startCollectionBtn.disabled = true;
        startCollectionBtn.innerHTML = 
            `<i class="fas fa-spinner fa-spin"></i> Coletando...`;
        loadingOverlay.classList.remove("hidden");
    } else {
        startCollectionBtn.disabled = false;
        startCollectionBtn.innerHTML = 
            `<i class="fas fa-download"></i> Iniciar Coleta`;
        loadingOverlay.classList.add("hidden");
    }
}

// Função para adicionar logs (chamada pelo Python)
eel.expose(add_log);
function add_log(message, type = "info") {
    addLog(message, type);
}

// Função para indicar que a coleta terminou (chamada pelo Python)
eel.expose(collection_finished);
function collection_finished() {
    setCollectionState(false);
    addLog("Processo de coleta finalizado.", "info");
    loadSeriesList(); // Recarrega a lista de séries após a coleta
}

// Função auxiliar para adicionar logs
function addLog(message, type = "info") {
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    logEntry.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <span class="message">${message}</span>
    `;
    
    logContainer.appendChild(logEntry);
    
    // Auto-scroll para o final
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Animação de entrada
    logEntry.style.opacity = "0";
    logEntry.style.transform = "translateY(10px)";
    
    setTimeout(() => {
        logEntry.style.transition = "all 0.3s ease";
        logEntry.style.opacity = "1";
        logEntry.style.transform = "translateY(0)";
    }, 10);
}

// Função para determinar o tipo de log baseado no conteúdo
function getLogType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("erro") || lowerMessage.includes("error")) {
        return "error";
    } else if (lowerMessage.includes("aviso") || lowerMessage.includes("warning")) {
        return "warning";
    } else if (lowerMessage.includes("sucesso") || lowerMessage.includes("finalizado") || lowerMessage.includes("salvos")) {
        return "info";
    } else {
        return "info";
    }
}

// Sobrescreve a função add_log para usar detecção automática de tipo
const originalAddLog = add_log;
add_log = function(message, type) {
    if (!type) {
        type = getLogType(message);
    }
    originalAddLog(message, type);
};

// Tratamento de erros globais
window.addEventListener("error", function(e) {
    addLog(`Erro na interface: ${e.message}`, "error");
});

// Previne o fechamento acidental durante a coleta
window.addEventListener("beforeunload", function(e) {
    if (isCollecting) {
        e.preventDefault();
        e.returnValue = "Uma coleta está em andamento. Tem certeza que deseja sair?";
        return e.returnValue;
    }
});

// --- Novas Funções para Visualização e Exportação ---

// Manipulador de clique nos itens do menu lateral
function handleMenuItemClick(event) {
    event.preventDefault();
    const clickedItem = event.currentTarget;
    const targetSectionId = clickedItem.dataset.section;

    // Remove 'active' de todos os itens do menu e adiciona ao clicado
    menuItems.forEach(item => item.classList.remove("active"));
    clickedItem.classList.add("active");

    // Esconde todas as seções de conteúdo e mostra a seção alvo
    contentSections.forEach(section => section.classList.add("hidden"));
    document.getElementById(`${targetSectionId}-section`).classList.remove("hidden");

    // Se for a seção de dados, recarrega a lista de séries
    if (targetSectionId === "data-view") {
        loadSeriesList();
    }
}

// Carrega a lista de séries do backend e popula o dropdown
async function loadSeriesList() {
    try {
        const seriesList = await eel.get_series_list()();
        seriesSelect.innerHTML = 
            `<option value="">Selecione uma série</option>`; // Limpa e adiciona opção padrão
        seriesList.forEach(seriesName => {
            const option = document.createElement("option");
            option.value = seriesName;
            option.textContent = seriesName;
            seriesSelect.appendChild(option);
        });
        // Desabilita botões de exportação até que uma série seja selecionada
        exportCsvBtn.disabled = true;
        exportExcelBtn.disabled = true;
    } catch (error) {
        addLog(`Erro ao carregar lista de séries: ${error.message}`, "error");
    }
}

// Manipulador de mudança de seleção no dropdown de séries
async function handleSeriesSelectChange() {
    currentSeriesName = seriesSelect.value;
    if (currentSeriesName) {
        addLog(`Carregando dados para a série: ${currentSeriesName}...`, "info");
        exportCsvBtn.disabled = true;
        exportExcelBtn.disabled = true;
        
        // Destruir tabela existente se houver
        if (currentDataTable) {
            currentDataTable.destroy();
            document.getElementById("data-table").getElementsByTagName("tbody")[0].innerHTML = "";
        }

        try {
            const data = await eel.get_series_data(currentSeriesName)();
            if (data.length > 0) {
                // Inicializa DataTables com os novos dados
                currentDataTable = $("#data-table").DataTable({
                    data: data,
                    columns: [
                        { data: "data", title: "Data" },
                        { data: "valor", title: "Valor" }
                    ],
                    destroy: true, // Permite reinicializar a tabela
                    paging: true,
                    searching: true,
                    ordering: true,
                    info: true,
                    responsive: true
                });
                addLog(`Dados da série ${currentSeriesName} carregados com sucesso.`, "info");
                exportCsvBtn.disabled = false;
                exportExcelBtn.disabled = false;
            } else {
                addLog(`Nenhum dado encontrado para a série ${currentSeriesName}.`, "warning");
            }
        } catch (error) {
            addLog(`Erro ao carregar dados da série ${currentSeriesName}: ${error.message}`, "error");
        }
    } else {
        // Se nenhuma série for selecionada, desabilita botões e limpa tabela
        exportCsvBtn.disabled = true;
        exportExcelBtn.disabled = true;
        if (currentDataTable) {
            currentDataTable.destroy();
            document.getElementById("data-table").getElementsByTagName("tbody")[0].innerHTML = "";
        }
    }
}

// Manipulador de exportação
async function handleExport(format) {
    if (!currentSeriesName) {
        addLog("Selecione uma série para exportar.", "warning");
        return;
    }

    addLog(`Exportando série ${currentSeriesName} para ${format.toUpperCase()}...`, "info");
    try {
        const result = await eel.export_series(currentSeriesName, format)();
        if (result.success) {
            addLog(`Sucesso! Arquivo salvo em: ${result.path}`, "info");
            alert(`Arquivo salvo em: ${result.path}`, "info");
            if (format === "csv") {
                window.location.href = result.path;
            } else if (format === "excel") {
                window.open(result.path, "_blank");
            }
        } else {
            addLog(`Erro ao exportar: ${result.error}`, "error");
            alert(`Erro ao exportar: ${result.error}`, "error");
        }
    } catch (error) {
        addLog(`Erro inesperado durante a exportação: ${error.message}`, "error");
        alert(`Erro inesperado: ${error.message}`, "error");
    }
}


