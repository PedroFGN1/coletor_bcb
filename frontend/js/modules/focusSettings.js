// focusSettings.js - Lógica de configurações do Boletim Focus

import { displayMessage, addLog, isValidDate } from './utils.js';
import { validationSystem } from './validation.js';

export class FocusSettings {
    constructor(logContainer) {
        this.logContainer = logContainer;
        this.elements = {
            saveFocusConfigBtn: document.getElementById("save-focus-config-btn"),
            saveFocusMessage: document.getElementById("save-focus-message"),
            focusFiltersContainer: document.getElementById("focus-filters-container")
        };
        
        this.endpointConfigs = {
            "ExpectativasMercadoAnuais": {
                name: "Expectativas de Mercado Anuais",
                filters: ["Indicador", "DataReferencia"],
                dataReferenceType: "year",
                description: "Consulta as projeções anuais para os principais indicadores econômicos.",
                tooltip: "Permite consultar expectativas para indicadores como IPCA, PIB, Selic para anos específicos."
            },
            "ExpectativaMercadoMensais": {
                name: "Expectativas de Mercado Mensais", 
                filters: ["Indicador", "DataReferencia"],
                dataReferenceType: "month",
                description: "Consulta as projeções mensais para os principais indicadores econômicos.",
                tooltip: "Consulte expectativas mensais para indicadores como IPCA, IGP-M, Selic."
            },
            "ExpectativasMercadoTrimestrais": {
                name: "Expectativas de Mercado Trimestrais",
                filters: ["Indicador", "DataReferencia"],
                dataReferenceType: "quarter",
                description: "Consulta as projeções trimestrais para o PIB.",
                tooltip: "Específico para projeções trimestrais do PIB Total."
            },
            "ExpectativasMercadoTop5Anuais": {
                name: "Expectativas de Mercado Top 5 Anuais",
                filters: ["Indicador", "DataReferencia", "tipoCalculo"],
                dataReferenceType: "year",
                description: "Consulta as projeções anuais do grupo Top 5 (curto e médio prazo).",
                tooltip: "Expectativas das 5 instituições com melhor ranking de acurácia."
            },
            "ExpectativasMercadoTop5Mensais": {
                name: "Expectativas de Mercado Top 5 Mensais",
                filters: ["Indicador", "DataReferencia", "tipoCalculo"],
                dataReferenceType: "month",
                description: "Consulta as projeções mensais do grupo Top 5 (curto prazo).",
                tooltip: "Expectativas mensais das 5 instituições com melhor ranking."
            },
            "ExpectativasMercadoSelic": {
                name: "Expectativas de Mercado Selic",
                filters: ["Reuniao"],
                description: "Consulta as projeções para a taxa Selic nas reuniões do Copom.",
                tooltip: "Expectativas para a taxa Selic em reuniões específicas do Copom."
            },
            "ExpectativasMercadoInflacao12Meses": {
                name: "Expectativas de Mercado para Inflação 12 meses",
                filters: ["Indicador", "Suavizada"],
                description: "Consulta as projeções de inflação para os próximos 12 meses.",
                tooltip: "Expectativas de inflação acumulada em 12 meses."
            },
            "ExpectativasMercadoInflacao24Meses": {
                name: "Expectativas de Mercado para Inflação 13 a 24 meses",
                filters: ["Indicador", "Suavizada"],
                description: "Consulta as projeções de inflação para o período de 13 a 24 meses à frente.",
                tooltip: "Expectativas de inflação para o período de 13 a 24 meses."
            },
            "ExpectativasMercadoTop5Selic": {
                name: "Expectativas de Mercado Selic Top 5",
                filters: ["Reuniao", "tipoCalculo"],
                description: "Consulta as projeções para a Selic do grupo Top 5.",
                tooltip: "Expectativas para Selic das 5 instituições com melhor ranking."
            }
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.saveFocusConfigBtn.addEventListener("click", () => this.handleSaveFocusConfig());
    }

    async loadFocusFilters() {
        try {
            // Carregar configurações salvas
            const savedConfig = await eel.get_focus_saved_filters()();
            
            this.elements.focusFiltersContainer.innerHTML = this.generateFiltersHTML();
            
            // Adicionar event listener para o seletor de endpoint
            const endpointSelect = document.getElementById("focus-endpoint-select");
            endpointSelect.addEventListener("change", () => this.loadDynamicFilters());
            
            // Configurar validação em tempo real
            this.setupValidation();
            
            // Carregar filtros salvos se existirem
            if (savedConfig && savedConfig.filters) {
                this.loadSavedFilters(savedConfig.filters);
            }
            
        } catch (error) {
            console.error("Erro ao carregar filtros do Focus:", error);
            this.elements.focusFiltersContainer.innerHTML = this.generateFiltersHTML();
        }
    }

    generateFiltersHTML() {
        const endpointOptions = Object.entries(this.endpointConfigs)
            .map(([key, config]) => `<option value="${key}" title="${config.tooltip}">${config.name}</option>`)
            .join('');

        return `
            <div class="form-group">
                <label for="focus-endpoint-select">
                    <i class="fas fa-server"></i> Endpoint do Focus:
                    <span class="required">*</span>
                    <div class="tooltip-container">
                        <span class="help-icon">?</span>
                        <div class="tooltip-content tooltip-interactive">
                            <h4>Tipos de Endpoint</h4>
                            <p><strong>Anuais:</strong> Projeções para anos completos</p>
                            <p><strong>Mensais:</strong> Projeções mensais</p>
                            <p><strong>Trimestrais:</strong> Específico para PIB</p>
                            <p><strong>Top 5:</strong> Melhores instituições</p>
                            <p><strong>Selic:</strong> Taxa básica de juros</p>
                            <p><strong>Inflação:</strong> Expectativas inflacionárias</p>
                        </div>
                    </div>
                </label>
                <select id="focus-endpoint-select" class="form-control" required>
                    <option value="">Selecione um endpoint</option>
                    ${endpointOptions}
                </select>
                <small class="form-text text-muted">Escolha o tipo de expectativa que deseja coletar</small>
            </div>
            
            <div id="endpoint-description" class="endpoint-description" style="display: none;">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <span id="endpoint-description-text"></span>
                </div>
            </div>
            
            <div id="dynamic-filters-container">
                <p class="text-muted">
                    <i class="fas fa-arrow-up"></i> Selecione um endpoint para ver os filtros disponíveis.
                </p>
            </div>
            
            <div class="form-group">
                <label for="focus-data-inicio-input">
                    <i class="fas fa-calendar-alt"></i> Data de Início:
                    <span class="required">*</span>
                    <div class="tooltip-container">
                        <span class="help-icon">?</span>
                        <div class="tooltip-content">
                            Data de início da consulta. Use o formato YYYY-MM-DD (ex: 2024-01-01)
                        </div>
                    </div>
                </label>
                <input type="date" id="focus-data-inicio-input" class="form-control" required>
                <small class="form-text text-muted">Data de início da consulta no formato YYYY-MM-DD</small>
            </div>
            
            <div class="form-group">
                <label for="focus-data-fim-input">
                    <i class="fas fa-calendar-alt"></i> Data de Fim (opcional):
                    <div class="tooltip-container">
                        <span class="help-icon">?</span>
                        <div class="tooltip-content">
                            Data final da consulta. Se não especificada, será usada a data atual
                        </div>
                    </div>
                </label>
                <input type="date" id="focus-data-fim-input" class="form-control">
                <small class="form-text text-muted">Se não especificada, será usada a data atual</small>
            </div>
        `;
    }

    setupValidation() {
        // Configurar validação para campos básicos
        const dataInicioInput = document.getElementById("focus-data-inicio-input");
        const dataFimInput = document.getElementById("focus-data-fim-input");
        const endpointSelect = document.getElementById("focus-endpoint-select");

        if (dataInicioInput) {
            validationSystem.setupRealTimeValidation(dataInicioInput, ['date']);
        }
        
        if (dataFimInput) {
            validationSystem.setupRealTimeValidation(dataFimInput, ['date']);
            
            // Validação customizada para data fim
            dataFimInput.addEventListener('blur', () => {
                const dataInicio = dataInicioInput.value;
                const dataFim = dataFimInput.value;
                
                if (dataInicio && dataFim && dataFim < dataInicio) {
                    validationSystem.showFieldError(dataFimInput, 'Data de fim deve ser posterior à data de início');
                }
            });
        }

        if (endpointSelect) {
            endpointSelect.addEventListener('change', () => {
                if (endpointSelect.value) {
                    validationSystem.clearFieldError(endpointSelect);
                }
            });
        }
    }

    loadDynamicFilters() {
        const selectedEndpoint = document.getElementById("focus-endpoint-select").value;
        const dynamicContainer = document.getElementById("dynamic-filters-container");
        const descriptionContainer = document.getElementById("endpoint-description");
        const descriptionText = document.getElementById("endpoint-description-text");
        
        if (!selectedEndpoint) {
            dynamicContainer.innerHTML = '<p class="text-muted"><i class="fas fa-arrow-up"></i> Selecione um endpoint para ver os filtros disponíveis.</p>';
            descriptionContainer.style.display = 'none';
            return;
        }

        const config = this.endpointConfigs[selectedEndpoint];
        
        // Mostrar descrição do endpoint
        descriptionText.textContent = config.description;
        descriptionContainer.style.display = 'block';

        let filtersHTML = '';
        
        config.filters.forEach(filter => {
            switch (filter) {
                case "Indicador":
                    filtersHTML += this.generateIndicadorFilter();
                    break;
                case "DataReferencia":
                    filtersHTML += this.generateDataReferenciaFilter(config.dataReferenceType);
                    break;
                case "Reuniao":
                    filtersHTML += this.generateReuniaoFilter();
                    break;
                case "tipoCalculo":
                    filtersHTML += this.generateTipoCalculoFilter();
                    break;
                case "Suavizada":
                    filtersHTML += this.generateSuavizadaFilter();
                    break;
            }
        });

        dynamicContainer.innerHTML = filtersHTML || '<p class="text-muted">Nenhum filtro adicional disponível para este endpoint.</p>';
        
        // Configurar validação para novos campos
        this.setupDynamicValidation();
    }

    setupDynamicValidation() {
        // Configurar validação para campos dinâmicos
        setTimeout(() => {
            const indicadorInput = document.getElementById("focus-indicador-input");
            const dataReferenciaInput = document.getElementById("focus-data-referencia-input");
            const reuniaoInput = document.getElementById("focus-reuniao-input");

            if (indicadorInput) {
                validationSystem.setupRealTimeValidation(indicadorInput, ['indicator']);
            }
            
            if (dataReferenciaInput) {
                const validators = [];
                if (dataReferenciaInput.type === 'number') {
                    validators.push('yearReference');
                } else {
                    validators.push('monthReference', 'quarterReference');
                }
                validationSystem.setupRealTimeValidation(dataReferenciaInput, validators);
            }
            
            if (reuniaoInput) {
                validationSystem.setupRealTimeValidation(reuniaoInput, ['meeting']);
            }
        }, 100);
    }

    generateIndicadorFilter() {
        return `
            <div class="form-group">
                <label for="focus-indicador-input">
                    <i class="fas fa-chart-line"></i> Indicador:
                    <div class="tooltip-container">
                        <span class="help-icon">?</span>
                        <div class="tooltip-content tooltip-interactive">
                            <h4>Indicadores Comuns</h4>
                            <ul>
                                <li><strong>IPCA:</strong> Índice de Preços ao Consumidor Amplo</li>
                                <li><strong>Selic:</strong> Taxa básica de juros</li>
                                <li><strong>Câmbio:</strong> Taxa de câmbio R$/US$</li>
                                <li><strong>PIB Total:</strong> Produto Interno Bruto</li>
                                <li><strong>IGP-M:</strong> Índice Geral de Preços do Mercado</li>
                            </ul>
                        </div>
                    </div>
                </label>
                <input type="text" id="focus-indicador-input" class="form-control" 
                       placeholder="Ex: IPCA, Selic, Câmbio, PIB Total" list="indicadores-list">
                <datalist id="indicadores-list">
                    <option value="IPCA">
                    <option value="Selic">
                    <option value="Câmbio">
                    <option value="PIB Total">
                    <option value="IGP-M">
                    <option value="Meta para taxa over-Selic">
                </datalist>
                <small class="form-text text-muted">Nome do indicador econômico</small>
            </div>
        `;
    }

    generateDataReferenciaFilter(type) {
        let placeholder, description, inputType = "text", tooltip;
        
        switch (type) {
            case "year":
                placeholder = "Ex: 2024";
                description = "Ano de referência da projeção";
                inputType = "number";
                tooltip = "Digite o ano para o qual deseja consultar as expectativas (ex: 2024)";
                return `
                    <div class="form-group">
                        <label for="focus-data-referencia-input">
                            <i class="fas fa-calendar"></i> Ano de Referência:
                            <div class="tooltip-container">
                                <span class="help-icon">?</span>
                                <div class="tooltip-content">${tooltip}</div>
                            </div>
                        </label>
                        <input type="${inputType}" id="focus-data-referencia-input" class="form-control" 
                               placeholder="${placeholder}" min="2000" max="2030">
                        <small class="form-text text-muted">${description}</small>
                    </div>
                `;
            case "month":
                placeholder = "Ex: jan/2024";
                description = "Mês e ano de referência da projeção (formato mmm/yyyy)";
                tooltip = "Use o formato mmm/yyyy onde mmm é o mês abreviado (jan, fev, mar, etc.)";
                break;
            case "quarter":
                placeholder = "Ex: 1/2024";
                description = "Trimestre e ano de referência da projeção (formato t/yyyy)";
                tooltip = "Use o formato t/yyyy onde t é o número do trimestre (1, 2, 3 ou 4)";
                break;
        }
        
        return `
            <div class="form-group">
                <label for="focus-data-referencia-input">
                    <i class="fas fa-calendar"></i> Data de Referência:
                    <div class="tooltip-container">
                        <span class="help-icon">?</span>
                        <div class="tooltip-content">${tooltip}</div>
                    </div>
                </label>
                <input type="text" id="focus-data-referencia-input" class="form-control" 
                       placeholder="${placeholder}">
                <small class="form-text text-muted">${description}</small>
            </div>
        `;
    }

    generateReuniaoFilter() {
        return `
            <div class="form-group">
                <label for="focus-reuniao-input">
                    <i class="fas fa-users"></i> Reunião do Copom:
                    <div class="tooltip-container">
                        <span class="help-icon">?</span>
                        <div class="tooltip-content">
                            Número da reunião do Copom no formato R255 (R seguido de 3 dígitos)
                        </div>
                    </div>
                </label>
                <input type="text" id="focus-reuniao-input" class="form-control" 
                       placeholder="Ex: R255" pattern="R\\d{3}">
                <small class="form-text text-muted">Número da reunião do Copom</small>
            </div>
        `;
    }

    generateTipoCalculoFilter() {
        return `
            <div class="form-group">
                <label for="focus-tipo-calculo-select">
                    <i class="fas fa-calculator"></i> Tipo de Cálculo:
                    <div class="tooltip-container">
                        <span class="help-icon">?</span>
                        <div class="tooltip-content">
                            Curto prazo: até 12 meses. Médio prazo: de 13 a 24 meses
                        </div>
                    </div>
                </label>
                <select id="focus-tipo-calculo-select" class="form-control">
                    <option value="">Selecione</option>
                    <option value="curto prazo">Curto Prazo</option>
                    <option value="médio prazo">Médio Prazo</option>
                </select>
                <small class="form-text text-muted">Tipo de cálculo para o grupo Top 5</small>
            </div>
        `;
    }

    generateSuavizadaFilter() {
        return `
            <div class="form-group">
                <label for="focus-suavizada-select">
                    <i class="fas fa-wave-square"></i> Expectativa Suavizada:
                    <div class="tooltip-container">
                        <span class="help-icon">?</span>
                        <div class="tooltip-content">
                            Expectativa suavizada remove outliers e aplica filtros estatísticos
                        </div>
                    </div>
                </label>
                <select id="focus-suavizada-select" class="form-control">
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                </select>
                <small class="form-text text-muted">Indica se a expectativa é suavizada</small>
            </div>
        `;
    }

    async loadSavedFilters(filters) {
        // Implementar carregamento dos filtros salvos
        Object.entries(filters).forEach(([key, value]) => {
            const element = document.getElementById(`focus-${key.toLowerCase()}-input`) || 
                           document.getElementById(`focus-${key.toLowerCase()}-select`);
            if (element && value) {
                element.value = value;
                if (key === 'endpoint') {
                    // Trigger change event para carregar filtros dinâmicos
                    element.dispatchEvent(new Event('change'));
                }
            }
        });
    }

    async handleSaveFocusConfig() {
        const focusConfig = this.getFocusConfigFromForm();
        
        if (!focusConfig) {
            displayMessage(this.elements.saveFocusMessage, "Erro: Preencha pelo menos o endpoint e a data de início.", "error");
            return;
        }
        
        // Validações adicionais
        if (!isValidDate(focusConfig.filters.Data)) {
            displayMessage(this.elements.saveFocusMessage, "Erro: Data de início inválida.", "error");
            return;
        }
        
        if (focusConfig.filters.DataFim && !isValidDate(focusConfig.filters.DataFim)) {
            displayMessage(this.elements.saveFocusMessage, "Erro: Data de fim inválida.", "error");
            return;
        }

        this.elements.saveFocusMessage.classList.remove('visible');
        displayMessage(this.elements.saveFocusMessage, "Salvando configurações...", "info");
        
        try {
            const result = await eel.save_focus_filters(focusConfig)();
            
            if (result.success) {
                displayMessage(this.elements.saveFocusMessage, "Configurações do Focus salvas com sucesso!", "success");
                addLog(this.logContainer, "Configurações do Boletim Focus salvas.", "success");
            } else {
                displayMessage(this.elements.saveFocusMessage, `Erro: ${result.error}`, "error");
            }
        } catch (error) {
            displayMessage(this.elements.saveFocusMessage, `Erro ao salvar: ${error.message}`, "error");
        }
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

    // Método público para ser chamado quando a seção for ativada
    onSectionActivated() {
        this.loadFocusFilters();
    }
}

