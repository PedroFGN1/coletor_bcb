import yaml
import eel

from modules.data_acquirer_focus import fetch_bcb_focus
from modules.data_processor import focus_processor
from persistence.sqlite_adapter import SQLiteAdapter
from utils.get_base_path import get_base_path
from utils.send_log_to_frontend import send_log_to_frontend

def _run_focus_collection(endpoint: str, filters: dict):
    """
    Lógica principal de coleta de dados do Boletim Focus.
    """
    send_log_to_frontend("Iniciando processo de coleta do Boletim Focus...")
    send_log_to_frontend(f"Endpoint: {endpoint}")
    send_log_to_frontend(f"Filtros: {filters}")
    
    try:
        # Mapear endpoint técnico para nome amigável
        endpoint_mapping = {
            "ExpectativasMercadoAnuais": "Expectativas de Mercado Anuais",
            "ExpectativaMercadoMensais": "Expectativas de Mercado Mensais",
            "ExpectativasMercadoTrimestrais": "Expectativas de Mercado Trimestrais",
            "ExpectativasMercadoTop5Anuais": "Expectativas de Mercado Top 5 Anuais",
            "ExpectativasMercadoTop5Mensais": "Expectativas de Mercado Top 5 Mensais",
            "ExpectativasMercadoSelic": "Expectativas de Mercado Selic",
            "ExpectativasMercadoInflacao12Meses": "Expectativas de Mercado para Inflação 12 meses",
            "ExpectativasMercadoInflacao24Meses": "Expectativas de Mercado para Inflação 13 a 24 meses",
            "ExpectativasMercadoTop5Selic": "Expectativas de Mercado Selic Top 5"
        }
        
        nome_boletim = endpoint_mapping.get(endpoint, endpoint)
        send_log_to_frontend(f"Coletando dados para: {nome_boletim}")
        
        # Chamar a função de coleta com os filtros
        df_resultado = fetch_bcb_focus(nome_boletim, **filters)
        
        if df_resultado is not None and not df_resultado.empty:
            send_log_to_frontend(f"Dados coletados com sucesso: {len(df_resultado)} registros")
            
            # Configurar banco de dados
            config_path = get_base_path("focus_config.yaml")
            try:
                with open(config_path, "r") as f:
                    config = yaml.safe_load(f)
            except FileNotFoundError:
                send_log_to_frontend("Erro: Arquivo focus_config.yaml não encontrado.")
                eel.collection_finished()()
                return
            
            db_config = config.get("database", {})
            db_type = db_config.get("type")
            db_name = db_config.get("db_name")
            
            if db_type == "sqlite":
                adapter = SQLiteAdapter(db_name)
                adapter.connect()
                
                try:
                    # Gerar nome da tabela baseado no endpoint e filtros
                    table_name = f"focus_{endpoint.lower()}"
                    if filters.get("Indicador"):
                        table_name += f"_{filters['Indicador'].lower().replace(' ', '_')}"
                    
                    df_resultado = focus_processor(df_resultado, endpoint, filters)
                    
                    if df_resultado.empty:
                        send_log_to_frontend("Nenhum dado válido para salvar após o processamento.")
                        eel.collection_finished('focus')()
                        return
                    # Salvar dados
                    adapter.save_data(table_name, df_resultado)
                    send_log_to_frontend(f"Dados salvos na tabela: {table_name}")
                    
                finally:
                    adapter.disconnect()
            else:
                send_log_to_frontend(f"Erro: Tipo de banco de dados '{db_type}' não suportado.")
        else:
            send_log_to_frontend("Nenhum dado foi retornado para os filtros especificados.")
            
    except ImportError:
        send_log_to_frontend("Erro: Módulo data_acquirer_focus não encontrado. Verifique se o arquivo está presente.")
    except Exception as e:
        send_log_to_frontend(f"Erro durante a coleta do Boletim Focus: {str(e)}")
    
    finally:
        send_log_to_frontend("Processo de coleta do Boletim Focus finalizado.")
        eel.collection_finished('focus')()

# Testando Executar a função diretamente
if __name__ == "__main__":
    _run_focus_collection("ExpectativasMercadoAnuais", {"Data": "2023-01-01"})