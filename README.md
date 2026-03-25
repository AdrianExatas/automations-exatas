# automations-exatas

Repositório principal das automações da Exatas, organizado por sistema de negócio.

## Convenção do repositório

- Cada automação ativa deve ter `README.md`, `.gitignore` e, quando necessário, `.env.example`.
- Código-fonte deve ficar em uma pasta previsível (`src/`, `electron/`, `scripts/` ou equivalente).
- Dados locais, certificados, planilhas operacionais, exports e artefatos de execução não devem ser versionados.
- Material legado deve ficar em `_legacy/`.
- Material exclusivamente local deve ficar em `_local/` ou em pastas já ignoradas pela automação.

Detalhes em [docs/REPOSITORY_CONVENTIONS.md](docs/REPOSITORY_CONVENTIONS.md).

## Catálogo

### Certificado

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Certificado-atualizar/` | Node.js/TypeScript | Ativo | Fluxos de certificado digital | `npm run build`, `npm start` |

### Dominio

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Dominio/DB/` | Python | Ativo | Consultas e mapeamentos do banco Domínio | scripts Python do diretório |
| `Dominio/Comparativo-Entradas-Saídas/` | Dados operacionais | Local | Workspace de planilhas/PDFs de execução | fora do versionamento do código |

### DTE

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `DTE-CaixaPostal/` | Electron + Playwright + TypeScript | Ativo | Varredura e exportação da Caixa Postal DTE | `npm run build`, `npm run electron:start` |

### Financeiro

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Financeiro/Renomear Notas/` | Python | Ativo | Renomeação de notas/arquivos financeiros | scripts `.bat` ou Python do projeto |

### Fsist

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Fsist/` | Node.js + Playwright | Ativo | Consulta e download de XMLs no FSist | `npm run automation` ou `baixar-notas-fsist.bat` |

### Omie

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Omie/Omie-fim-de-ano/` | Python | Ativo | Rotinas de fechamento/fim de ano no Omie | conforme `README.md` do projeto |

### Onvio

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Onvio/Comparar Adiantamentos Liquidos Domínio/` | Node.js/TypeScript | Ativo | Comparação e integração de dados Onvio/Domínio | conforme `README.md` |
| `Onvio/Gestta-Tarefas/Alterar-responsavel/` | Node.js/TypeScript | Ativo | Alteração de responsável de tarefas no Gestta | conforme `README.md` |
| `Onvio/Gestta-Tarefas/Inserir-tarefas/` | Node.js/TypeScript | Ativo | Espelhar empresas e responsáveis no Gestta | conforme `README.md` |
| `Onvio/ONVIO_Certificado/` | Node.js/TypeScript | Ativo | Rotinas de certificado no Onvio | conforme `README.md` |
| `Onvio/Parametrizar Onvio/` | Python + Tkinter | Ativo | Parametrização de departamentos/usuários no Onvio | `interface.bat`, `executar.bat` ou `python automacao.py` |
| `Onvio/Permissoes-usuarios-cliente/` | Electron + Playwright + TypeScript | Ativo | Extração e automação de permissões de usuários | conforme `README.md` |
| `Onvio/BD/` | Node.js/TypeScript | Externo local | Repositório aninhado mantido separadamente do monorepo | gerenciado no próprio diretório |

### Parcelamentos

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Parcelamentos/SEFAZ-AL/` | Node.js/TypeScript | Ativo | Consulta/extração de parcelamentos na SEFAZ AL | `npm test` ou `npm run start` |
| `Parcelamentos/SEFAZ-BA/` | Node.js/TypeScript | Ativo | Consulta/extração de parcelamentos na SEFAZ BA | `npm test` ou `npm run start` |
| `Parcelamentos/SEFAZ-SE/` | Node.js/TypeScript | Ativo | Consulta/extração de parcelamentos na SEFAZ SE | conforme `README.md` |

### Sieg

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Sieg/SIEG_Certificado/` | Node.js/TypeScript + Python | Ativo | Certificado digital integrado ao SIEG | conforme `README.md` |
| `Sieg/XML_SIEG/` | Python | Ativo | Download, organização e envio de XMLs | conforme `README.md` |

### Unecont

| Caminho | Stack | Status | Objetivo | Execução |
| --- | --- | --- | --- | --- |
| `Unecont/` | Node.js/TypeScript + Playwright | Ativo | Download, reformatacao e upload de relatórios | conforme `README.md` |
