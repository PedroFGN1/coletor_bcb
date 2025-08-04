// validation.js - Sistema de validação aprimorado

export class ValidationSystem {
    constructor() {
        this.validators = new Map();
        this.errorMessages = new Map();
        this.init();
    }

    init() {
        this.setupDefaultValidators();
        this.setupDefaultMessages();
    }

    setupDefaultValidators() {
        // Validador de data
        this.addValidator('date', (value) => {
            if (!value) return true; // Campo opcional
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(value)) return false;
            const date = new Date(value);
            return date instanceof Date && !isNaN(date);
        });

        // Validador de código de série
        this.addValidator('seriesCode', (value) => {
            if (!value) return false;
            return /^\d+$/.test(value.trim());
        });

        // Validador de nome base
        this.addValidator('baseName', (value) => {
            if (!value) return false;
            const trimmed = value.trim();
            if (trimmed.length < 2) return false;
            
            // Não deve conter palavras de período
            const periodKeywords = ['diaria', 'mensal', 'anual', 'diário', 'diário'];
            return !periodKeywords.some(keyword => 
                trimmed.toLowerCase().includes(keyword)
            );
        });

        // Validador de indicador
        this.addValidator('indicator', (value) => {
            if (!value) return true; // Campo opcional
            const trimmed = value.trim();
            return trimmed.length >= 2 && trimmed.length <= 50;
        });

        // Validador de reunião Copom
        this.addValidator('meeting', (value) => {
            if (!value) return true; // Campo opcional
            return /^R\d{3}$/.test(value.trim());
        });

        // Validador de data de referência anual
        this.addValidator('yearReference', (value) => {
            if (!value) return true; // Campo opcional
            const year = parseInt(value);
            const currentYear = new Date().getFullYear();
            return year >= 2000 && year <= currentYear + 10;
        });

        // Validador de data de referência mensal
        this.addValidator('monthReference', (value) => {
            if (!value) return true; // Campo opcional
            return /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\d{4}$/i.test(value.trim());
        });

        // Validador de data de referência trimestral
        this.addValidator('quarterReference', (value) => {
            if (!value) return true; // Campo opcional
            return /^[1-4]\/\d{4}$/.test(value.trim());
        });
    }

    setupDefaultMessages() {
        this.errorMessages.set('date', 'Data deve estar no formato YYYY-MM-DD');
        this.errorMessages.set('seriesCode', 'Código da série deve conter apenas números');
        this.errorMessages.set('baseName', 'Nome base deve ter pelo menos 2 caracteres e não conter palavras de período');
        this.errorMessages.set('indicator', 'Indicador deve ter entre 2 e 50 caracteres');
        this.errorMessages.set('meeting', 'Reunião deve estar no formato R255 (R + 3 dígitos)');
        this.errorMessages.set('yearReference', 'Ano deve estar entre 2000 e ' + (new Date().getFullYear() + 10));
        this.errorMessages.set('monthReference', 'Data deve estar no formato mmm/yyyy (ex: jan/2024)');
        this.errorMessages.set('quarterReference', 'Data deve estar no formato t/yyyy (ex: 1/2024)');
        this.errorMessages.set('required', 'Este campo é obrigatório');
        this.errorMessages.set('generic', 'Valor inválido');
    }

    addValidator(name, validatorFn) {
        this.validators.set(name, validatorFn);
    }

    addErrorMessage(validatorName, message) {
        this.errorMessages.set(validatorName, message);
    }

    validateField(element, validatorNames = []) {
        const value = element.value;
        const isRequired = element.hasAttribute('required');
        
        // Verificar se é obrigatório e está vazio
        if (isRequired && (!value || value.trim() === '')) {
            this.showFieldError(element, this.errorMessages.get('required'));
            return false;
        }

        // Se não é obrigatório e está vazio, é válido
        if (!isRequired && (!value || value.trim() === '')) {
            this.clearFieldError(element);
            return true;
        }

        // Executar validadores específicos
        for (const validatorName of validatorNames) {
            const validator = this.validators.get(validatorName);
            if (validator && !validator(value)) {
                const message = this.errorMessages.get(validatorName) || this.errorMessages.get('generic');
                this.showFieldError(element, message);
                return false;
            }
        }

        this.clearFieldError(element);
        return true;
    }

    validateForm(formElement) {
        const fields = formElement.querySelectorAll('input, select, textarea');
        let isValid = true;

        fields.forEach(field => {
            const validators = this.getFieldValidators(field);
            if (!this.validateField(field, validators)) {
                isValid = false;
            }
        });

        return isValid;
    }

    getFieldValidators(element) {
        const validators = [];
        const id = element.id;
        const type = element.type;

        // Mapear validadores baseado no ID do campo
        if (id.includes('data') || type === 'date') {
            validators.push('date');
        }
        if (id.includes('series-code')) {
            validators.push('seriesCode');
        }
        if (id.includes('base-name')) {
            validators.push('baseName');
        }
        if (id.includes('indicador')) {
            validators.push('indicator');
        }
        if (id.includes('reuniao')) {
            validators.push('meeting');
        }
        if (id.includes('data-referencia')) {
            if (id.includes('year') || element.type === 'number') {
                validators.push('yearReference');
            } else if (id.includes('month')) {
                validators.push('monthReference');
            } else if (id.includes('quarter')) {
                validators.push('quarterReference');
            }
        }

        return validators;
    }

    showFieldError(element, message) {
        this.clearFieldError(element);
        
        element.classList.add('is-invalid');
        
        // Criar tooltip de erro
        const errorTooltip = document.createElement('div');
        errorTooltip.className = 'form-tooltip show';
        errorTooltip.textContent = message;
        errorTooltip.setAttribute('data-validation-error', 'true');
        
        // Posicionar tooltip
        const container = element.closest('.form-group') || element.parentElement;
        container.style.position = 'relative';
        container.appendChild(errorTooltip);
        
        // Adicionar ícone de erro
        const errorIcon = document.createElement('i');
        errorIcon.className = 'fas fa-exclamation-circle text-danger';
        errorIcon.style.position = 'absolute';
        errorIcon.style.right = '10px';
        errorIcon.style.top = '50%';
        errorIcon.style.transform = 'translateY(-50%)';
        errorIcon.style.pointerEvents = 'none';
        errorIcon.setAttribute('data-validation-icon', 'true');
        
        if (element.tagName === 'SELECT') {
            errorIcon.style.right = '30px';
        }
        
        container.appendChild(errorIcon);
    }

    clearFieldError(element) {
        element.classList.remove('is-invalid');
        
        const container = element.closest('.form-group') || element.parentElement;
        
        // Remover tooltips de erro
        const errorTooltips = container.querySelectorAll('[data-validation-error="true"]');
        errorTooltips.forEach(tooltip => tooltip.remove());
        
        // Remover ícones de erro
        const errorIcons = container.querySelectorAll('[data-validation-icon="true"]');
        errorIcons.forEach(icon => icon.remove());
    }

    clearFormErrors(formElement) {
        const fields = formElement.querySelectorAll('input, select, textarea');
        fields.forEach(field => this.clearFieldError(field));
    }

    setupRealTimeValidation(element, validatorNames = []) {
        const validators = validatorNames.length > 0 ? validatorNames : this.getFieldValidators(element);
        
        // Validação em tempo real com debounce
        let timeout;
        const validateWithDelay = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.validateField(element, validators);
            }, 300);
        };

        element.addEventListener('input', validateWithDelay);
        element.addEventListener('blur', () => {
            clearTimeout(timeout);
            this.validateField(element, validators);
        });
    }

    setupFormValidation(formElement) {
        const fields = formElement.querySelectorAll('input, select, textarea');
        
        // Configurar validação em tempo real para todos os campos
        fields.forEach(field => {
            this.setupRealTimeValidation(field);
        });

        // Validação no submit
        formElement.addEventListener('submit', (e) => {
            if (!this.validateForm(formElement)) {
                e.preventDefault();
                e.stopPropagation();
                
                // Focar no primeiro campo com erro
                const firstInvalidField = formElement.querySelector('.is-invalid');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
            }
        });
    }
}

// Instância global do sistema de validação
export const validationSystem = new ValidationSystem();

