# parametrizar-onvio

Automacao em Python com interface Tkinter para parametrizar departamentos e usuarios no Onvio.

## Arquivos principais

- `automacao.py`: fluxo Selenium principal
- `interface.py`: interface grafica
- `dados.json`: exemplo seguro versionado
- `dados.json.example`: base para configuracao local
- `docs/operacao.md`: guia operacional detalhado

## Setup

```bash
pip install -r requirements.txt
```

## Execucao

```bash
python automacao.py
```

No Windows, tambem e possivel usar:

```bat
interface.bat
executar.bat
```

## Dados locais

- use `dados.json` apenas com exemplos seguros no repositorio
- mantenha planilhas operacionais e arquivos auxiliares em `_local/`
- consulte `docs/operacao.md` para o fluxo operacional completo
