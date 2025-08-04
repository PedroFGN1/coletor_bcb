// dataView.js - Lógica de visualização de dados

import { addLog } from './utils.js';

export class DataView {
    constructor(logContainer) {
        this.logContainer = logContainer;
        this.dataTable = null;
        this.elements = {
            seriesSelect: document.getElementById("series-select"),
            exportCsvBtn: document.getElementById("export-csv-btn"),
            exportExcelBtn: document.getElementById("export-excel-btn"),
            dataTableElement: document.getElementById("data-table")
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.seriesSelect.addEventListener("change", () => this.handleSeriesSelectChange());
        this.elements.exportCsvBtn.addEventListener("click", () => this.handleExport("csv"));
        this.elements.exportExcelBtn.addEventListener("click", () => this.handleExport("excel"));
    }

    async loadSeriesList() {
        try {
            const seriesList = await eel.get_series_list()();
            this.elements.seriesSelect.innerHTML = "<option value=''>Selecione uma série</option>";
            seriesList.forEach(series => {
                const option = new Option(series, series);
                this.elements.seriesSelect.add(option);
            });
        } catch (error) {
            addLog(this.logContainer, `Erro ao carregar lista de séries: ${error.message}`, "error");
        }
    }

    async handleSeriesSelectChange() {
        const seriesName = this.elements.seriesSelect.value;
        if (!seriesName) {
            if (this.dataTable) this.dataTable.clear().draw();
            this.elements.exportCsvBtn.disabled = true;
            this.elements.exportExcelBtn.disabled = true;
            return;
        }

        try {
            const seriesData = await eel.get_series_data(seriesName)();
            this.updateDataTable(seriesData);
            this.elements.exportCsvBtn.disabled = false;
            this.elements.exportExcelBtn.disabled = false;
        } catch (error) {
            addLog(this.logContainer, `Erro ao carregar dados da série: ${error.message}`, "error");
        }
    }

    updateDataTable(seriesData) {
        if (this.dataTable) {
            this.dataTable.clear();
            this.dataTable.rows.add(seriesData.map(row => [row.data, row.valor]));
            this.dataTable.draw();
        } else {
            this.dataTable = $(this.elements.dataTableElement).DataTable({
                data: seriesData.map(row => [row.data, row.valor]),
                columns: [{ title: "Data" }, { title: "Valor" }],
                responsive: true,
                language: { url: "//cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json" },
                pageLength: 25,
                order: [[0, 'desc']], // Ordenar por data decrescente
                columnDefs: [
                    {
                        targets: 0,
                        type: 'date'
                    },
                    {
                        targets: 1,
                        type: 'num',
                        render: function(data, type, row) {
                            if (type === 'display' && data !== null) {
                                return parseFloat(data).toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 6
                                });
                            }
                            return data;
                        }
                    }
                ]
            });
        }
    }

    async handleExport(format) {
        const seriesName = this.elements.seriesSelect.value;
        if (!seriesName) return;
        
        try {
            addLog(this.logContainer, `Exportando ${seriesName} para ${format.toUpperCase()}...`, "info");
            const result = await eel.export_series(seriesName, format)();
            
            if (result.success) {
                addLog(this.logContainer, `Arquivo salvo em: ${result.path}`, "success");
                this.showExportNotification(`Arquivo ${format.toUpperCase()} exportado com sucesso!`, "success");
            } else {
                addLog(this.logContainer, `Erro na exportação: ${result.error}`, "error");
                this.showExportNotification(`Erro na exportação: ${result.error}`, "error");
            }
        } catch (error) {
            addLog(this.logContainer, `Erro ao exportar: ${error.message}`, "error");
            this.showExportNotification(`Erro ao exportar: ${error.message}`, "error");
        }
    }

    showExportNotification(message, type) {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.className = `export-notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Método público para ser chamado quando a seção for ativada
    onSectionActivated() {
        this.loadSeriesList();
    }
}

