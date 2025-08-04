// settings.js - Lógica de configurações de séries temporais

import { displayMessage, sanitizeTableName } from './utils.js';

export class Settings {
    constructor() {
        this.elements = {
            configuredSeriesTableBody: document.querySelector("#configured-series-table tbody"),
            addSeriesToListBtn: document.getElementById("add-series-to-list-btn"),
            saveConfigurationsBtn: document.getElementById("save-configurations-btn"),
            seriesCodeInput: document.getElementById("series-code-input"),
            baseNameInput: document.getElementById("base-name-input"),
            periodicitySelect: document.getElementById("periodicity-select"),
            generatedTableNameInput: document.getElementById("generated-table-name"),
            addSeriesErrorMessage: document.getElementById("add-series-error-message"),
            saveConfigMessage: document.getElementById("save-config-message")
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.addSeriesToListBtn.addEventListener("click", () => this.handleAddSeriesToList());
        this.elements.saveConfigurationsBtn.addEventListener("click", () => this.handleSaveConfigurations());
        
        [this.elements.baseNameInput, this.elements.periodicitySelect].forEach(el => {
            el.addEventListener("input", () => this.updateGeneratedTableName());
        });
    }

    async loadCurrentConfigurations() {
        try {
            const config = await eel.get_current_config()();
            this.elements.configuredSeriesTableBody.innerHTML = "";
            
            if (config && config.series_codes) {
                for (const [code, name] of Object.entries(config.series_codes)) {
                    const periodicity = name.split("_").pop();
                    this.addSeriesRowToTable(code, name, periodicity, false);
                }
            }
        } catch (error) {
            displayMessage(this.elements.saveConfigMessage, `Erro ao carregar configurações: ${error.message}`, "error");
        }
    }

    handleAddSeriesToList() {
        const code = this.elements.seriesCodeInput.value.trim();
        const baseName = this.elements.baseNameInput.value.trim();
        const periodicity = this.elements.periodicitySelect.value;
        const generatedName = this.elements.generatedTableNameInput.value;

        // Limpar mensagem anterior
        this.elements.addSeriesErrorMessage.classList.remove('visible');

        // Validações
        if (!code || !baseName || !periodicity) {
            displayMessage(this.elements.addSeriesErrorMessage, "Todos os campos são obrigatórios.", "error");
            return;
        }

        if (!/^\d+$/.test(code)) {
            displayMessage(this.elements.addSeriesErrorMessage, "O código da série deve conter apenas números.", "error");
            return;
        }

        const periodKeywords = ["diaria", "mensal", "anual"];
        if (periodKeywords.some(p => baseName.toLowerCase().includes(p))) {
            displayMessage(this.elements.addSeriesErrorMessage, "O Nome Base não deve conter palavras de período.", "error");
            return;
        }

        // Verificar duplicatas
        const existingCodes = Array.from(this.elements.configuredSeriesTableBody.querySelectorAll('tr'))
            .map(row => row.cells[0].textContent);
        
        if (existingCodes.includes(code)) {
            displayMessage(this.elements.addSeriesErrorMessage, "Este código de série já foi adicionado.", "error");
            return;
        }

        this.addSeriesRowToTable(code, generatedName, periodicity, true);
        this.clearForm();
        
        displayMessage(this.elements.addSeriesErrorMessage, "Série adicionada com sucesso!", "success");
    }

    addSeriesRowToTable(code, tableName, periodicity, isNew) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="text-center">${code}</td>
            <td class="text-center">${tableName}</td>
            <td class="text-center">${periodicity}</td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm remove-series-btn" title="Remover série">
                    <i class="fas fa-trash"></i> Remover
                </button>
            </td>
        `;
        
        // Aplicar estilo visual para novas séries
        if (isNew) {
            row.classList.add("new-series-row");
        }

        row.querySelector(".remove-series-btn").addEventListener("click", () => {
            if (confirm(`Tem certeza que deseja remover a série ${code}?`)) {
                row.remove();
            }
        });

        this.elements.configuredSeriesTableBody.appendChild(row);
    }

    clearForm() {
        this.elements.seriesCodeInput.value = "";
        this.elements.baseNameInput.value = "";
        this.elements.periodicitySelect.value = "";
        this.elements.generatedTableNameInput.value = "";
    }

    updateGeneratedTableName() {
        const baseName = this.elements.baseNameInput.value.trim();
        const periodicity = this.elements.periodicitySelect.value;

        if (!baseName || !periodicity) {
            this.elements.generatedTableNameInput.value = "";
            return;
        }

        const sanitizedBase = sanitizeTableName(baseName);
        this.elements.generatedTableNameInput.value = `${sanitizedBase}_${periodicity.toLowerCase()}`;
    }

    async handleSaveConfigurations() {
        const rows = this.elements.configuredSeriesTableBody.querySelectorAll("tr");
        
        if (rows.length === 0) {
            displayMessage(this.elements.saveConfigMessage, "Adicione pelo menos uma série antes de salvar.", "error");
            return;
        }

        const configData = { series: [] };

        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            configData.series.push({
                code: cells[0].textContent,
                table_name: cells[1].textContent,
                periodicidade: cells[2].textContent
            });
        });

        // Limpar mensagem anterior
        this.elements.saveConfigMessage.classList.remove('visible');
        displayMessage(this.elements.saveConfigMessage, "Validando e salvando...", "info");
        
        try {
            const result = await eel.validate_and_save_configuration(configData)();

            if (result.success) {
                displayMessage(this.elements.saveConfigMessage, "Configurações salvas com sucesso!", "success");
                
                // Normalizar estilo após salvar - remover classe new-series-row de todas as linhas
                const newSeriesRows = this.elements.configuredSeriesTableBody.querySelectorAll(".new-series-row");
                newSeriesRows.forEach(row => {
                    row.classList.remove("new-series-row");
                });
            } else {
                displayMessage(this.elements.saveConfigMessage, `Erro: ${result.error}`, "error");
            }
        } catch (error) {
            displayMessage(this.elements.saveConfigMessage, `Erro ao salvar: ${error.message}`, "error");
        }
    }

    // Método público para ser chamado quando a seção for ativada
    onSectionActivated() {
        this.loadCurrentConfigurations();
    }
}

