# automations-exatas

Repositorio principal das automacoes da Exatas, organizado por sistema de negocio.

## Convencao do repositorio

- Cada automacao ativa deve ter `README.md`, `.gitignore` e, quando necessario, `.env.example`.
- Codigo-fonte deve ficar em uma pasta previsivel (`src/`, `electron/`, `scripts/` ou equivalente).
- Dados locais, certificados, planilhas operacionais, exports e artefatos de execucao nao devem ser versionados.
- Material legado deve ficar em `_legacy/`.
- Material exclusivamente local deve ficar em `_local/` ou em pastas ja ignoradas pela automacao.

Detalhes em [docs/REPOSITORY_CONVENTIONS.md](docs/REPOSITORY_CONVENTIONS.md).

## Catalogo

### Certificado

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Certificado-atualizar/` | Node.js/TypeScript | Ativo | Fluxos de certificado digital | `npm run build`, `npm start` |

### Dominio

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Dominio/DB/` | Python | Ativo | Consultas e mapeamentos do banco Dominio | scripts Python do diretorio |
| `Dominio/Comparativo-Entradas-Saidas/` | Dados operacionais | Local | Workspace de planilhas/PDFs de execucao | fora do versionamento do codigo |

### DTE

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `DTE-CaixaPostal/` | Electron + Playwright + TypeScript | Ativo | Varredura e exportacao da Caixa Postal DTE | `npm run build`, `npm run electron:start` |

### Financeiro

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Financeiro/Renomear Notas/` | Python | Ativo | Renomeacao de notas/arquivos financeiros | scripts `.bat` ou Python do projeto |

### Fsist

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Fsist/` | Node.js + Playwright | Ativo | Consulta e download de XMLs no FSist | `npm run automation` ou `baixar-notas-fsist.bat` |

### Omie

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Omie/Omie-fim-de-ano/` | Python | Ativo | Rotinas de fechamento/fim de ano no Omie | conforme `README.md` do projeto |

### Onvio

`Onvio/gestta-tarefas/` e um diretorio de grupo. Execute uma das automacoes filhas listadas abaixo.

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Onvio/comparar-adiantamentos-liquidos-dominio/` | Node.js/TypeScript | Ativo | Comparacao e integracao de dados Onvio/Dominio | conforme `README.md` |
| `Onvio/gestta-tarefas/alterar-responsavel/` | Node.js/TypeScript | Ativo | Alteracao de responsavel de tarefas no Gestta | conforme `README.md` |
| `Onvio/gestta-tarefas/inserir-tarefas/` | Node.js/TypeScript | Ativo | Espelhar empresas e responsaveis no Gestta | conforme `README.md` |
| `Onvio/onvio-certificado/` | Node.js/TypeScript | Ativo | Rotinas de certificado no Onvio | conforme `README.md` |
| `Onvio/parametrizar-onvio/` | Python + Tkinter | Ativo | Parametrizacao de departamentos/usuarios no Onvio | `interface.bat`, `executar.bat` ou `python automacao.py` |
| `Onvio/permissoes-usuarios-cliente/` | Electron + Playwright + TypeScript | Ativo | Extracao e automacao de permissoes de usuarios | conforme `README.md` |
| `Onvio/BD/` | Node.js/TypeScript | Externo local | Repositorio aninhado mantido separadamente do monorepo | gerenciado no proprio diretorio |

### Parcelamentos

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Parcelamentos/SEFAZ-AL/` | Node.js/TypeScript | Ativo | Consulta/extracao de parcelamentos na SEFAZ AL | `npm test` ou `npm run start` |
| `Parcelamentos/SEFAZ-BA/` | Node.js/TypeScript | Ativo | Consulta/extracao de parcelamentos na SEFAZ BA | `npm test` ou `npm run start` |
| `Parcelamentos/SEFAZ-SE/` | Node.js/TypeScript | Ativo | Consulta/extracao de parcelamentos na SEFAZ SE | conforme `README.md` |

### Sieg

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Sieg/SIEG_Certificado/` | Node.js/TypeScript + Python | Ativo | Certificado digital integrado ao SIEG | conforme `README.md` |
| `Sieg/XML_SIEG/` | Python | Ativo | Download, organizacao e envio de XMLs | conforme `README.md` |

### Unecont

| Caminho | Stack | Status | Objetivo | Execucao |
| --- | --- | --- | --- | --- |
| `Unecont/` | Node.js/TypeScript + Playwright | Ativo | Download, reformatacao e upload de relatorios | conforme `README.md` |
