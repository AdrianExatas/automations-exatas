# baixar-e-solicitar-xml-sefaz

Automacao TypeScript/Bun para consultar solicitacoes de XML na SEFAZ, baixar os arquivos disponibilizados e opcionalmente enviar os XMLs para o SIEG. A implementacao Python permanece apenas como legado.

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
cd TS
bun install
bunx playwright install chromium
```

Crie um `.env` a partir de `.env.example`.

## Variaveis de ambiente

```env
SEFAZ_CERT_PFX_PATH="certificado/arquivo.pfx"
SEFAZ_CERT_PFX_PASSWORD=sua_senha_do_certificado
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

### Fluxo principal

```bash
bun run TS/src-ts/cli/consulta.ts --transport auto
bun run TS/src-ts/cli/download.ts --upload --transport auto
bun run TS/src-ts/cli/solicitar.ts --inscricao 123 --tipo NFE --pesquisar-por Emitida --data-inicial 01/08/2026 --data-final 01/08/2026 --visible
```

`auto` tenta HTTP primeiro e recorre ao Playwright somente quando o novo Portal
Fazendario tornar a navegacao HTTP incompativel. O comando `solicitar` cria uma
unica solicitacao controlada; use dados reais somente quando desejar envi-la.

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
cd TS
bun run typecheck
bun test
```

## Documentacao complementar

- `docs/AUTOMACAO_AGENDAMENTO.md`
- `docs/ANTIVIRUS_CONFIGURACAO.md`
