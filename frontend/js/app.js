// Elementos DOM
const startCollectionBtn = document.getElementById('start-collection-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const logContainer = document.getElementById('log-container');
const loadingOverlay = document.getElementById('loading-overlay');

// Estado da aplicação
let isCollecting = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    addLog('Sistema inicializado com sucesso.', 'info');
});

// Configuração dos event listeners
function setupEventListeners() {
    startCollectionBtn.addEventListener('click', handleStartCollection);
    clearLogsBtn.addEventListener('click', handleClearLogs);
}

// Manipulador do botão de iniciar coleta
function handleStartCollection() {
    if (isCollecting) return;
    
    setCollectionState(true);
    addLog('Iniciando processo de coleta...', 'info');
    
    // Chama a função Python através do Eel
    eel.start_data_collection();
}

// Manipulador do botão de limpar logs
function handleClearLogs() {
    logContainer.innerHTML = '';
    addLog('Logs limpos.', 'info');
}

// Gerencia o estado da coleta
function setCollectionState(collecting) {
    isCollecting = collecting;
    
    if (collecting) {
        startCollectionBtn.disabled = true;
        startCollectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Coletando...';
        loadingOverlay.classList.remove('hidden');
    } else {
        startCollectionBtn.disabled = false;
        startCollectionBtn.innerHTML = '<i class="fas fa-download"></i> Iniciar Coleta';
        loadingOverlay.classList.add('hidden');
    }
}

// Função para adicionar logs (chamada pelo Python)
eel.expose(add_log);
function add_log(message, type = 'info') {
    addLog(message, type);
}

// Função para indicar que a coleta terminou (chamada pelo Python)
eel.expose(collection_finished);
function collection_finished() {
    setCollectionState(false);
    addLog('Processo de coleta finalizado.', 'info');
}

// Função auxiliar para adicionar logs
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    logEntry.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <span class="message">${message}</span>
    `;
    
    logContainer.appendChild(logEntry);
    
    // Auto-scroll para o final
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Animação de entrada
    logEntry.style.opacity = '0';
    logEntry.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        logEntry.style.transition = 'all 0.3s ease';
        logEntry.style.opacity = '1';
        logEntry.style.transform = 'translateY(0)';
    }, 10);
}

// Função para determinar o tipo de log baseado no conteúdo
function getLogType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('erro') || lowerMessage.includes('error')) {
        return 'error';
    } else if (lowerMessage.includes('aviso') || lowerMessage.includes('warning')) {
        return 'warning';
    } else if (lowerMessage.includes('sucesso') || lowerMessage.includes('finalizado') || lowerMessage.includes('salvos')) {
        return 'info';
    } else {
        return 'info';
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
window.addEventListener('error', function(e) {
    addLog(`Erro na interface: ${e.message}`, 'error');
});

// Previne o fechamento acidental durante a coleta
window.addEventListener('beforeunload', function(e) {
    if (isCollecting) {
        e.preventDefault();
        e.returnValue = 'Uma coleta está em andamento. Tem certeza que deseja sair?';
        return e.returnValue;
    }
});

