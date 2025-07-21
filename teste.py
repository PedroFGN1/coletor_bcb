import requests

def buscar_series_metadados(search_term):
    """
    Busca metadados de séries no endpoint OData do BCB via texto na descrição.
    """
    base = "https://dadosabertos.bcb.gov.br/api/v1/odata/Metadados"
    filters = f"$filter=contains(Nome, '{search_term}')"
    params = {
        "$filter": f"contains(Nome, '{search_term}')",
        "$top": "20"
    }

    resp = requests.get(base, params=params)
    resp.raise_for_status()
    data = resp.json()

    # Entradas relevantes no JSON
    return [
        {
            'id': e['Id'], 
            'nome': e['Nome'], 
            'unidade': e.get('Unidade'), 
            'periodicidade': e.get('PeriodicidadeFormatado')
        }
        for e in data.get('value', [])
    ]

# Exemplo de uso
if __name__ == "__main__":
    termo = input("Buscar séries contendo: ")
    resultados = buscar_series_metadados(termo)

    if not resultados:
        print("Nenhuma série encontrada.")
    else:
        print(f"{len(resultados)} séries encontradas:\n")
        for s in resultados:
            print(f"• {s['id']} – {s['nome']} ({s['unidade']}, {s['periodicidade']})")