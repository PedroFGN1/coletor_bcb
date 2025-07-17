def separar_palavras():
    filepath = 'texto.txt'
    try:
        with open(filepath, 'r') as file:
            texto = file.read()
            palavras = [[p.replace(",", "") for p in linha.split()] for linha in texto.splitlines() ]
            print(palavras)
    except FileNotFoundError:
        print(f"Erro: O arquivo '{filepath}' não foi encontrado.")

if __name__ == "__main__":
    separar_palavras()