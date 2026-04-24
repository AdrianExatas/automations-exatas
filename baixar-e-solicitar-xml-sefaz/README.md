# baixar-e-solicitar-xml-sefaz

Automacao em Python para consultar solicitacoes de XML na SEFAZ, baixar os arquivos disponibilizados e opcionalmente enviar os XMLs para o SIEG.

## Objetivo

- consultar e solicitar XMLs na SEFAZ
- baixar XMLs prontos via HTTP ou Selenium
- reorganizar, extrair e tratar arquivos auxiliares
- validar e enviar XMLs diretamente para o SIEG
- permitir operacao manual, agendada e com utilitarios de manutencao

## Estrutura

- `src/`: modulos da automacao
- `apps/`: interfaces Tkinter
- `scripts/`: CLIs principais, utilitarios e diagnostico
- `tests/`: testes automatizados
- `docs/`: documentacao operacional
- `_local/`: estado local criado em runtime

## Setup

```bash
pip install -r requirements.txt
```

Crie um `.env` a partir de `.env.example`.

## Variaveis de ambiente

```env
USUARIO_SEFAZ=seu_usuario
SENHA_SEFAZ=sua_senha
SIEG_API_KEY=sua_api_key
UPLOAD_NUM_WORKERS=3
UPLOAD_DELAY_SECONDS=0.1
LIMPEZA_AUTOMATICA_XMLS_PRESOS=true
```

## Saidas locais

- downloads continuam em `~/Downloads/XML SEFAZ`
- checkpoints e historico ficam em `_local/checkpoints/`
- backups de checkpoint ficam em `_local/checkpoints/backups/`
- logs locais ficam em `_local/logs/`
- locks de execucao ficam em `_local/lock/`

## Execucao

### GUIs

```bash
python apps/consulta_gui.py
python apps/download_gui.py
```

### Fluxo principal

```bash
python scripts/executar_consulta.py
python scripts/executar_consulta.py --headless
python scripts/executar_consulta.py --status

python scripts/executar_download.py
python scripts/executar_download.py --headless
python scripts/executar_download.py --upload
python scripts/executar_download.py --status

python scripts/executar_upload.py --auto
```

O upload automatico valida os XMLs locais e envia todos os arquivos validos diretamente para o SIEG. Nao ha consulta previa para verificar se a chave ja existe na API.

### Utilitarios

```bash
python scripts/processar_xmls_presos.py
python scripts/extrair_zips_aninhados.py
python scripts/limpar_pasta_base.py
python scripts/reorganizar_downloads.py
python scripts/diagnostico/diagnostico_chromedriver.py
python scripts/diagnostico/limpar_cache.py
```

### Agendamento no Windows

```powershell
.\scripts\configurar_agendamento.ps1
```

## Testes

```bash
python -m pytest tests -q
```

## Documentacao complementar

- `docs/AUTOMACAO_AGENDAMENTO.md`
- `docs/ANTIVIRUS_CONFIGURACAO.md`
