// controlPanel.js - Lógica do painel de controle

import { addLog, displayMessage } from './utils.js';

export class ControlPanel {
    constructor() {
        this.isCollecting = false;
        this.elements = {
            startCollectionBtn: document.getElementById("start-collection-btn"),
            startFocusCollectionBtn: document.getElementById("start-focus-collection-btn"),
            clearLogsBtn: document.getElementById("clear-logs-btn"),
            logContainer: document.getElementById("log-container"),
            loadingOverlay: document.getElementById("loading-overlay")
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        addLog(this.elements.logContainer, "Sistema inicializado com sucesso.", "info");
    }

    setupEventListeners() {
        this.elements.startCollectionBtn.addEventListener("click", () => this.handleStartCollection());
        this.elements.startFocusCollectionBtn.addEventListener("click", () => this.handleStartFocusCollection());
        this.elements.clearLogsBtn.addEventListener("click", () => this.handleClearLogs());
    }

    handleStartCollection() {
        if (this.isCollecting) return;
        this.setCollectionState(true);
        addLog(this.elements.logContainer, "Iniciando processo de coleta...", "info");
        eel.start_data_collection();
    }

    handleStartFocusCollection() {
        if (this.isCollecting) return;
        
        // Verificar se há configurações salvas do Focus
        const focusConfig = this.getFocusConfigFromForm();
        if (!focusConfig || !focusConfig.endpoint || !focusConfig.filters.Data) {
            addLog(this.elements.logContainer, "Erro: Configure os filtros do Boletim Focus antes de iniciar a coleta.", "error");
            return;
        }
        
        this.setCollectionState(true);
        addLog(this.elements.logContainer, "Iniciando processo de coleta do Boletim Focus...", "info");
        addLog(this.elements.logContainer, `Endpoint selecionado: ${focusConfig.endpoint}`, "info");
        addLog(this.elements.logContainer, `Filtros aplicados: ${JSON.stringify(focusConfig.filters)}`, "info");
        
        // Chamar função do backend com os filtros
        eel.start_focus_collection(focusConfig.endpoint, focusConfig.filters);
    }

    handleClearLogs() {
        this.elements.logContainer.innerHTML = "";
        addLog(this.elements.logContainer, "Logs limpos.", "info");
    }

    setCollectionState(collecting) {
        this.isCollecting = collecting;
        this.elements.loadingOverlay.classList.toggle("hidden", !collecting);
        this.elements.startCollectionBtn.disabled = collecting;
        this.elements.startFocusCollectionBtn.disabled = collecting;
        
        this.elements.startCollectionBtn.innerHTML = collecting 
            ? `<i class="fas fa-spinner fa-spin"></i> Coletando...` 
            : `<i class="fas fa-download"></i> Iniciar Coleta Séries Temporais`;
            
        this.elements.startFocusCollectionBtn.innerHTML = collecting 
            ? `<i class="fas fa-spinner fa-spin"></i> Coletando...` 
            : `<i class="fas fa-chart-line"></i> Iniciar Coleta Boletim Focus`;
    }

    getFocusConfigFromForm() {
        const endpoint = document.getElementById("focus-endpoint-select")?.value;
        const dataInicio = document.getElementById("focus-data-inicio-input")?.value;
        const dataFim = document.getElementById("focus-data-fim-input")?.value;
        
        if (!endpoint || !dataInicio) {
            return null;
        }
        
        const filters = {
            Data: dataInicio
        };
        
        // Adicionar filtros dinâmicos baseados no endpoint
        const indicador = document.getElementById("focus-indicador-input")?.value;
        const dataReferencia = document.getElementById("focus-data-referencia-input")?.value;
        const reuniao = document.getElementById("focus-reuniao-input")?.value;
        const tipoCalculo = document.getElementById("focus-tipo-calculo-select")?.value;
        const suavizada = document.getElementById("focus-suavizada-select")?.value;
        
        if (indicador) filters.Indicador = indicador;
        if (dataReferencia) filters.DataReferencia = dataReferencia;
        if (reuniao) filters.Reuniao = reuniao;
        if (tipoCalculo) filters.tipoCalculo = tipoCalculo;
        if (suavizada) filters.Suavizada = suavizada;
        if (dataFim) filters.DataFim = dataFim;
        
        return {
            endpoint: endpoint,
            filters: filters
        };
    }

    // Método público para finalizar coleta (chamado pelo main.js)
    finishCollection() {
        this.setCollectionState(false);
        addLog(this.elements.logContainer, "Processo de coleta finalizado.", "info");
    }

    // Método público para adicionar logs (chamado pelo main.js)
    addLogEntry(message, type) {
        addLog(this.elements.logContainer, message, type);
    }
}

