def validate_and_save_configuration(config_data: dict):
    """
    Valida e salva a configuração de séries.
    """
    current_config_path = get_base_path("config.yaml")
    try:
        with open(current_config_path, "r") as f:
            current_config = yaml.safe_load(f)
    except FileNotFoundError:
        current_config = {"database": {"type": "sqlite", "db_name": "dados_bcb.db"}, "series_codes": {}}

    # Critério 3: Inicializar estruturas de verificação de unicidade
    unique_codes = set()
    unique_table_names = set()
    
    new_series_codes = {}
    for series in config_data.get("series", []):
        code = str(series["code"])
        table_name = series["table_name"]
        periodicidade = series["periodicidade"]

        # Critério 3: Verificação de duplicatas na lista atual
        if code in unique_codes:
            return {"success": False, "error": f"Código de série duplicado encontrado: {code}"}
        if table_name in unique_table_names:
            return {"success": False, "error": f"Nome de tabela duplicado encontrado: {table_name}"}
        
        unique_codes.add(code)
        unique_table_names.add(table_name)

        # Critério 1: Validação de Existência Baseada na Periodicidade
        try:
            # Definir intervalo dinâmico baseado na periodicidade
            if periodicidade == "diaria":
                days_back = 30
            elif periodicidade == "mensal":
                days_back = 90
            elif periodicidade == "anual":
                days_back = 366
            else:
                days_back = 30  # padrão para periodicidades não reconhecidas
            
            start_date = datetime.now() - pd.Timedelta(days=days_back)
            test_data = fetch_bcb_series(code, start_date, datetime.now(), table_name)
            
            if test_data.empty:
                return {"success": False, "error": f"Série {code} ({table_name}) não retornou dados. Verifique o código da série."}
        except Exception as e:
            return {"success": False, "error": f"Erro ao validar série {code} ({table_name}): {str(e)}"}

        # Critério 2: Validação Real de Periodicidade
        try:
            test_data = process_series_data(test_data, code)
            inferred_periodicity = infer_periodicity(test_data)
            if inferred_periodicity != periodicidade and inferred_periodicity != "Desconhecida":
                return {"success": False, "error": f"Periodicidade inconsistente para série {code} ({table_name}). Esperado: {periodicidade}, Detectado: {inferred_periodicity}"}
        except Exception as e:
            return {"success": False, "error": f"Erro ao validar periodicidade da série {code} ({table_name}): {str(e)}"}
        
        new_series_codes[code] = table_name

    current_config["series_codes"] = new_series_codes

    try:
        with open(current_config_path, "w") as f:
            yaml.safe_dump(current_config, f, sort_keys=False)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": f"Erro ao salvar config.yaml: {str(e)}"}
    
def infer_periodicity(df: pd.DataFrame) -> str:
    """
    Analisa um DataFrame de série temporal e infere sua periodicidade
    baseada na diferença entre datas consecutivas.

    Args:
        df: DataFrame com coluna 'data' contendo as datas da série
        
    Returns:
        str: "Diária", "Mensal", "Anual" ou "Desconhecida"
    """
    if df.empty or len(df) < 2:
        return "Desconhecida"

    # Garantir que a coluna data está em formato datetime
    df_copy = df.copy()
    df_copy['data'] = pd.to_datetime(df_copy['data'])

    # Ordenar por data para garantir sequência correta
    df_copy = df_copy.sort_values('data')

    # Calcular diferenças em dias entre datas consecutivas
    date_diffs = df_copy['data'].diff().dt.days.dropna()

    if date_diffs.empty:
        return "Desconhecida"

    try:
        # Calcular a moda (valor mais comum) das diferenças
        most_common_diff = mode(date_diffs)
        
        # Classificar baseado na diferença mais comum
        if most_common_diff == 1:
            return "diaria"
        elif 28 <= most_common_diff <= 31:
            return "mensal"
        elif 365 <= most_common_diff <= 366:
            return "anual"
        else:
            return "Desconhecida"
            
    except Exception:
        # Em caso de erro ou dados inconsistentes
        return "Desconhecida"
    
def process_series_data(df, series_code):
    """
    Processa o DataFrame bruto da série temporal.
    Renomeia colunas e garante o formato de data correto.
    """
    if df.empty:
        return pd.DataFrame()

    # A biblioteca python-bcb já retorna o DataFrame com a coluna de data como índice
    # e com o nome 'value' para o valor da série.
    # Vamos resetar o índice para ter 'Date' como uma coluna e renomear 'value' para 'Value'
    df = df.reset_index()
    df.columns = ['data', 'valor']

    # Garante que a coluna 'data' esteja no formato datetime
    df['data'] = pd.to_datetime(df['data'], format= '%Y-%m-%d', errors='coerce')

    return df

def fetch_bcb_series(code, start_date=None, end_date=None, table_name=""):
    """
    Busca dados de uma série temporal do BCB a partir de uma data de início.
    Lida com a limitação de 10 anos para séries diárias.
    """
    all_data = pd.DataFrame()
    current_start_date = start_date if start_date else datetime(1900, 1, 1)
    current_end_date = end_date if end_date else datetime.now()
    is_daily_series = False

    if "diaria" in table_name:
        # Para séries diárias, buscar em chunks de 10 anos
        is_daily_series = True

    while current_start_date <= current_end_date:
        try:
            if is_daily_series:
                # Para séries diárias, buscar em chunks de 10 anos
                end_date_chunk = current_start_date + timedelta(days=365 * 10) - timedelta(days=1)
                if end_date_chunk > current_end_date:
                    end_date_chunk = current_end_date
                
                print(f'Buscando série {code} de {current_start_date.strftime("%Y-%m-%d")} até {end_date_chunk.strftime("%Y-%m-%d")}')
                df_chunk = sgs.get({"value": code}, start=current_start_date, end=end_date_chunk)
            else:
                # Para outras periodicidades, buscar tudo de uma vez até a data final
                print(f'Buscando série {code} a partir de {current_start_date.strftime("%Y-%m-%d")} até {current_end_date.strftime("%Y-%m-%d")}')
                df_chunk = sgs.get({"value": code}, start=current_start_date, end=current_end_date)

            if df_chunk.empty:
                break

            all_data = pd.concat([all_data, df_chunk])

            if not is_daily_series or end_date_chunk >= current_end_date:
                break
            
            current_start_date = end_date_chunk + timedelta(days=1)

        except Exception as e:
            print(f"Erro ao buscar série {code}: {e}")
            break

    return all_data