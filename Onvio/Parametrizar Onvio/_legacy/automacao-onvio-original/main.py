import tkinter as tk
from tkinter import messagebox
from selenium_config import configurar_driver
from onvio_auth import login_onvio
from onvio_usuario import criar_usuario

def criar_usuario_interface():
    nome = entry_nome.get()
    email = entry_email.get()
    cliente_id = entry_cliente.get()
    if not nome or not email or not cliente_id:
        messagebox.showerror("Erro", "Preencha todos os campos!")
        return
    try:
        driver, wait = configurar_driver()
        login_onvio(driver, wait, 'adrian@exatascontabilidade.com.br', 'Exatas1010+')
        criar_usuario(driver, wait, nome, email, cliente_id)
        messagebox.showinfo("Sucesso", f"Usuário '{nome}' criado com sucesso!")
    except Exception as e:
        messagebox.showerror("Erro", f"Ocorreu um erro: {e}")
    finally:
        try:
            driver.quit()
        except:
            pass

root = tk.Tk()
root.title("Cadastro de Usuário Onvio")

tk.Label(root, text="Nome do Usuário:").grid(row=0, column=0, padx=10, pady=5, sticky="e")
entry_nome = tk.Entry(root, width=40)
entry_nome.grid(row=0, column=1, padx=10, pady=5)

tk.Label(root, text="Email do Usuário:").grid(row=1, column=0, padx=10, pady=5, sticky="e")
entry_email = tk.Entry(root, width=40)
entry_email.grid(row=1, column=1, padx=10, pady=5)

tk.Label(root, text="ID do Cliente:").grid(row=2, column=0, padx=10, pady=5, sticky="e")
entry_cliente = tk.Entry(root, width=40)
entry_cliente.grid(row=2, column=1, padx=10, pady=5)

btn_criar = tk.Button(root, text="Criar Usuário", command=criar_usuario_interface)
btn_criar.grid(row=3, column=0, columnspan=2, pady=15)

root.mainloop()

import tkinter as tk
from tkinter import messagebox
from selenium_config import configurar_driver
from onvio_auth import login_onvio
from onvio_usuario import criar_usuario

def criar_usuario_interface():
    nome = entry_nome.get()
    email = entry_email.get()
    cliente_id = entry_cliente.get()
    if not nome or not email or not cliente_id:
        messagebox.showerror("Erro", "Preencha todos os campos!")
        return
    try:
        driver, wait = configurar_driver()
        login_onvio(driver, wait, 'adrian@exatascontabilidade.com.br', 'Exatas1010+')
        criar_usuario(driver, wait, nome, email, cliente_id)
        messagebox.showinfo("Sucesso", f"Usuário '{nome}' criado com sucesso!")
    except Exception as e:
        messagebox.showerror("Erro", f"Ocorreu um erro: {e}")
    finally:
        try:
            driver.quit()
        except:
            pass

root = tk.Tk()
root.title("Cadastro de Usuário Onvio")

tk.Label(root, text="Nome do Usuário:").grid(row=0, column=0, padx=10, pady=5, sticky="e")
entry_nome = tk.Entry(root, width=40)
entry_nome.grid(row=0, column=1, padx=10, pady=5)

tk.Label(root, text="Email do Usuário:").grid(row=1, column=0, padx=10, pady=5, sticky="e")
entry_email = tk.Entry(root, width=40)
entry_email.grid(row=1, column=1, padx=10, pady=5)

tk.Label(root, text="ID do Cliente:").grid(row=2, column=0, padx=10, pady=5, sticky="e")
entry_cliente = tk.Entry(root, width=40)
entry_cliente.grid(row=2, column=1, padx=10, pady=5)

btn_criar = tk.Button(root, text="Criar Usuário", command=criar_usuario_interface)
btn_criar.grid(row=3, column=0, columnspan=2, pady=15)

root.mainloop()