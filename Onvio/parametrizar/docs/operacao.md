# Operacao

## Instalacao

1. Instale o Python:
   `https://www.python.org/downloads/`
2. Abra o PowerShell na pasta do projeto.
3. Execute:

```bash
pip install -r requirements.txt
```

## Configurar os dados

Edite `dados.json` com a estrutura abaixo:

```json
{
  "cnpj": "12345678000195",
  "departamentos": [
    {
      "departamento": "Auditoria",
      "usuario": "Bruno Costa"
    }
  ]
}
```

Ajuste os departamentos e usuarios conforme a empresa a ser parametrizada.

## Credenciais de login

As credenciais ficam configuradas em `automacao.py`.

Se precisar alterar localmente, ajuste os valores de `EMAIL_LOGIN` e `SENHA_LOGIN`.

## Executar a automacao

Opcao 1, interface grafica:

```bat
interface.bat
```

Opcao 2, linha de comando:

```bat
executar.bat
```

Opcao 3, PowerShell:

```bash
python automacao.py
```

## O que a automacao faz

1. Abre o Chrome e faz login no Onvio.
2. Navega ate a lista de clientes.
3. Pesquisa o CNPJ informado.
4. Abre a aba de departamentos da empresa.
5. Preenche os departamentos e usuarios definidos no `dados.json`.

## Ajustes locais

Em `automacao.py`, o principal ajuste operacional costuma ser:

- `TEMPO_ESPERA`: intervalo entre acoes do navegador

## Solucao de problemas

- `Python nao encontrado`: instale o Python e marque `Add Python to PATH`
- `selenium not found`: execute `pip install -r requirements.txt`
- `TimeoutError`: aumente `TEMPO_ESPERA` em `automacao.py`
- `CNPJ nao encontrado`: revise o valor configurado no `dados.json`
- `Erro de login`: confirme as credenciais definidas localmente
