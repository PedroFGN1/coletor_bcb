// main.js - Arquivo principal da aplicação

import { ControlPanel } from './modules/controlPanel.js';
import { DataView } from './modules/dataView.js';
import { Settings } from './modules/settings.js';
import { FocusSettings } from './modules/focusSettings.js';
import { getLogType } from './modules/utils.js';

class App {
    constructor() {
        this.currentSection = 'control-panel-section';
        this.modules = {};
        this.elements = {
            menuItems: document.querySelectorAll(".menu-item"),
            contentSections: document.querySelectorAll(".content-section"),
            configTypeSelect: document.getElementById("config-type-select"),
            seriesTemporaisConfig: document.getElementById("series-temporais-config"),
            boletimFocusConfig: document.getElementById("boletim-focus-config")
        };
        
        this.init();
    }

    init() {
        this.initializeModules();
        this.setupEventListeners();
        this.setupEelCallbacks();
        this.handleGlobalErrors();
        
        // Ativar seção inicial
        this.activateSection('control-panel-section');
    }

    initializeModules() {
        // Inicializar módulos
        this.modules.controlPanel = new ControlPanel();
        this.modules.dataView = new DataView(this.modules.controlPanel.elements.logContainer);
        this.modules.settings = new Settings();
        this.modules.focusSettings = new FocusSettings(this.modules.controlPanel.elements.logContainer);
    }

    setupEventListeners() {
        // Event listeners para navegação
        this.elements.menuItems.forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                this.handleMenuClick(item);
            });
        });

        // Event listener para seletor de tipo de configuração
        this.elements.configTypeSelect.addEventListener("change", () => {
            this.handleConfigTypeChange();
        });

        // Prevenir fechamento acidental durante coleta
        window.addEventListener('beforeunload', (e) => {
            if (this.modules.controlPanel.isCollecting) {
                e.preventDefault();
                e.returnValue = 'Uma coleta está em andamento. Tem certeza que deseja sair?';
                return e.returnValue;
            }
        });
    }

    setupEelCallbacks() {
        // Expor funções para o backend chamar
        eel.expose(this.addLog, 'add_log');
        eel.expose(this.collectionFinished, 'collection_finished');
    }

    handleGlobalErrors() {
        // Tratamento de erros globais
        window.addEventListener('error', (e) => {
            this.modules.controlPanel.addLogEntry(`Erro na interface: ${e.message}`, 'error');
        });

        // Tratamento de erros de promises rejeitadas
        window.addEventListener('unhandledrejection', (e) => {
            this.modules.controlPanel.addLogEntry(`Erro não tratado: ${e.reason}`, 'error');
        });
    }

    handleMenuClick(clickedItem) {
        // Remover classe active de todos os itens
        this.elements.menuItems.forEach(item => item.classList.remove("active"));
        clickedItem.classList.add("active");

        const sectionId = clickedItem.dataset.section;
        this.activateSection(sectionId);
    }

    activateSection(sectionId) {
        // Atualizar seções visíveis
        this.elements.contentSections.forEach(section => {
            section.classList.toggle("active", section.id === sectionId);
        });

        this.currentSection = sectionId;

        // Chamar métodos específicos baseados na seção ativada
        switch (sectionId) {
            case "data-view-section":
                this.modules.dataView.onSectionActivated();
                break;
            case "settings-section":
                this.modules.settings.onSectionActivated();
                this.handleConfigTypeChange(); // Garantir que a seção correta seja exibida
                break;
        }
    }

    handleConfigTypeChange() {
        const selectedType = this.elements.configTypeSelect.value;
        
        if (selectedType === "series-temporais") {
            this.elements.seriesTemporaisConfig.style.display = "block";
            this.elements.boletimFocusConfig.style.display = "none";
        } else if (selectedType === "boletim-focus") {
            this.elements.seriesTemporaisConfig.style.display = "none";
            this.elements.boletimFocusConfig.style.display = "block";
            this.modules.focusSettings.onSectionActivated();
        }
    }

    // Métodos expostos para o backend
    addLog = (message, type) => {
        if (!type) {
            type = getLogType(message);
        }
        this.modules.controlPanel.addLogEntry(message, type);
    }

    collectionFinished = () => {
        this.modules.controlPanel.finishCollection();
        
        // Se estiver na seção de visualização de dados, recarregar a lista
        if (this.currentSection === "data-view-section") {
            this.modules.dataView.onSectionActivated();
        }
    }

    // Método público para acessar módulos (para debugging)
    getModule(moduleName) {
        return this.modules[moduleName];
    }
}

// Inicializar aplicação quando DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
    window.app = new App();
});

