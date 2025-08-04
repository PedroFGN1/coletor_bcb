import eel

def send_log_to_frontend(message):
    """
    Envia mensagens de log para a interface web.
    """
    print(message) # Mantém o print no terminal para debug
    eel.add_log(message)()