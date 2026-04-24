# SIEG XML

Aplicacao desktop Windows para baixar, organizar e processar XMLs fiscais no SIEG.

O download por chave suporta atualmente NF-e (modelo 55), NFC-e (modelo 65) e CT-e (modelo 57).

## Estrutura

```text
Sieg/xml/
  src/sieg_xml/
    api/
    cli/
      commands/
    config/
    core/
    gui/
      controllers/
      views/
    services/
    utils/
  packaging/windows/
  tools/
    nfe/
    windows/
  archive/legacy/
  docs/
  planilhas/
    MODELO.xlsx
```

## Desenvolvimento

1. Crie ou ative um ambiente virtual.
2. Instale o projeto em modo editavel:

```bash
pip install -e .[dev]
```

3. Para desenvolvimento local, copie `.env.example` para `.env` e configure:

```env
SIEG_API_KEY=sua_chave
SIEG_XML_DATA_DIR=_local
SIEG_XML_TYPE_NFCE=4
```

## Interfaces suportadas

Execucao principal:

```bash
sieg-xml --help
python -m sieg_xml --help
```

Interface grafica:

```bash
sieg-xml desktop
python -m sieg_xml desktop
```

CLI tecnica:

```bash
sieg-xml download --arquivo relatorio.xlsx
sieg-xml upload --pasta "C:\XMLs" --threads 10
sieg-xml extract --arquivo relatorio.xlsx
sieg-xml organize
sieg-xml danfe --anos 2024,2025
sieg-xml move-report --planilha relatorio.xlsx
```

Ferramentas auxiliares suportadas:

```bash
python tools/nfe/extrair_totais.py --help
tools/windows/baixar_xmls.bat
tools/windows/reprocessar_erros.bat
tools/windows/reprocessar_notas.bat
```

Os antigos wrappers em `scripts/` deixaram de ser interface oficial.

## Configuracao da maquina

Em instalacoes Windows compartilhadas, a aplicacao prioriza a configuracao em:

```text
%ProgramData%\SIEG XML\config\.env
```

Arquivo minimo:

```env
SIEG_API_KEY=sua_chave
```

Configuracoes opcionais de tipo XML:

```env
SIEG_XML_TYPE_NFCE=4
```

Os diretorios operacionais ficam por padrao em:

```text
%ProgramData%\SIEG XML\data\
  inputs\
  logs\
  reports\
  uploads\
  work\
  xmls\
```

Se `SIEG_XML_DATA_DIR` estiver definido, ele sobrescreve a pasta padrao de dados.

## Build Windows

Os artefatos de build ficam em `packaging/windows/`.

Fluxo padrao:

```powershell
Copy-Item packaging\windows\config\.env.example packaging\windows\config\.env
# edite a chave real no arquivo acima
.\packaging\windows\build.ps1
```

O script gera:

- bundle desktop via PyInstaller em `dist\SIEG XML\`
- instalador via Inno Setup em `installer\`

## Observacoes

- A GUI distribuida no v1 cobre download e reorganizacao.
- O usuario pode escolher a pasta de destino a cada execucao.
- `archive/legacy/` guarda material historico e nao faz parte da superficie suportada.
