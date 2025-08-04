// utils.js - Funções utilitárias e helpers

/**
 * Exibe mensagens de feedback para o usuário
 * @param {HTMLElement} element - Elemento onde exibir a mensagem
 * @param {string} message - Texto da mensagem
 * @param {string} type - Tipo da mensagem (success, error, info, warning)
 */
export function displayMessage(element, message, type) {
    element.textContent = message;
    element.className = `visible ${type}`;
    
    // Auto-ocultar após 5 segundos para mensagens de sucesso
    if (type === 'success') {
        setTimeout(() => {
            element.classList.remove('visible');
        }, 5000);
    }
}

/**
 * Adiciona uma entrada de log ao container de logs
 * @param {HTMLElement} logContainer - Container dos logs
 * @param {string} message - Mensagem do log
 * @param {string} type - Tipo do log (info, error, warning, success)
 */
export function addLog(logContainer, message, type = "info") {
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="message">${message}</span>`;
    logContainer.appendChild(logEntry);
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

/**
 * Determina o tipo de log baseado no conteúdo da mensagem
 * @param {string} message - Mensagem para analisar
 * @returns {string} Tipo do log
 */
export function getLogType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('erro') || lowerMessage.includes('error')) {
        return 'error';
    } else if (lowerMessage.includes('aviso') || lowerMessage.includes('warning')) {
        return 'warning';
    } else if (lowerMessage.includes('sucesso') || lowerMessage.includes('finalizado') || lowerMessage.includes('salvos')) {
        return 'success';
    } else {
        return 'info';
    }
}

/**
 * Sanitiza uma string para uso como nome de tabela
 * @param {string} input - String de entrada
 * @returns {string} String sanitizada
 */
export function sanitizeTableName(input) {
    return input.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/**
 * Valida se uma data está no formato YYYY-MM-DD
 * @param {string} dateString - String da data
 * @returns {boolean} True se válida
 */
export function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * Debounce function para limitar chamadas de função
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

