# Documentacao tecnica — Automacao SEFAZ-AL

## Objetivo

Baixar o boleto (DAR/PDF) da parcela atual de **todos os parcelamentos ativos** de cada empresa informada na planilha, no portal do contribuinte da SEFAZ-AL.

## Escopo

- Entrada: planilha Excel com login por empresa
- Processamento: uma empresa por vez
- Saida: PDFs organizados + relatorio XLSX de sucessos/falhas
- Transporte: navegador (Playwright) ou HTTP com fallback

Fora de escopo: criar parcelamentos, pagar, alterar dados cadastrais.

## Arquitetura

```text
planilha.xlsx
    |
    v
workbook.ts  --> InputRow[] (empresa, usuario, senha)
    |
    +--> automation.ts / main.ts     (browser)
    |         |
    |         v
    |     portal.ts (login, listar, calcular, emitir, baixar)
    |
    +--> main-http.ts / http-client.ts  (API + fallback browser)
    |
    v
PDFs + resultado-*.xlsx
```

| Arquivo | Papel |
|---------|--------|
| [`src/workbook.ts`](../src/workbook.ts) | Leitura da planilha e escrita do relatorio |
| [`src/automation.ts`](../src/automation.ts) | Orquestracao browser reutilizavel (CLI e app) |
| [`src/main.ts`](../src/main.ts) | Entrypoint CLI browser |
| [`src/portal.ts`](../src/portal.ts) | Fluxo Playwright no portal |
| [`src/http-client.ts`](../src/http-client.ts) | Cliente HTTP autenticado |
| [`src/main-http.ts`](../src/main-http.ts) | Entrypoint CLI HTTP + fallback |
| [`src/utils.ts`](../src/utils.ts) | Nomes de pasta/arquivo e datas |

## Fluxo browser (padrao)

Para cada linha da planilha:

1. Abrir sessao no portal do contribuinte
2. Autenticar com `USUARIO` / `SENHA`
3. Listar consolidacoes/parcelamentos ativos
4. Para cada consolidacao ativa:
   - Abrir detalhe
   - Calcular parcela atual (com retentativas em timeouts)
   - Emitir / baixar PDF
5. Registrar resultado no relatorio
6. Em falhas recuperaveis (overlay, timeout de calculo/download), pode retentar em novo contexto

Se nao houver consolidacoes ativas, o resultado e classificado como `sem_consolidacao`.

## Fluxo HTTP

Resumo dos endpoints (detalhes em [`spike-http-resultado.md`](spike-http-resultado.md)):

1. `POST /sfz-security-api/api/autenticar`
2. `GET /api/account` → `numeroPessoa`
3. `POST .../consolidacao/consultar` (header `x-pessoadetrabalho`)
4. `GET .../parcelamento/gerar/{id}/1/{data}`
5. `GET .../parcelamento/{id}/1/{data}` → emite DAR
6. `POST .../dar/visualizar` → PDF

Cabecalhos autenticados: `Authorization: Bearer {token}` e `x-pessoadetrabalho`.

Quando a emissao HTTP falha antes de produzir PDF util, o modo HTTP pode acionar o fluxo browser como fallback.

## Modelo de entrada

Colunas oficiais (arquivo `EmpresasAlagoas.xlsx`):

- `CODIGO`
- `EMPRESA`
- `CNPJ`
- `USUARIO`
- `SENHA`
- `OBSERVAÇÃO`

Obrigatorias para a automacao: `EMPRESA`, `USUARIO`, `SENHA`.

## Saidas

### Estrutura de pastas (browser)

```text
output/downloads/<execucao>/
  <EMPRESA>/
    PARCELAMENTO N° <CONSOLIDACAO>/
      PARCELA N°<n> DE <total> - <CONSOLIDACAO>.pdf
```

### Relatorio

Principais colunas: empresa, usuario, consolidacao, parcelamento, parcela emitida, vencimento, arquivo, status, mensagem, `CATEGORIA_ERRO`, `FASE_ERRO`.

## Categorias de erro

| Categoria | Significado tipico |
|-----------|--------------------|
| `credencial` | Usuario/senha invalidos |
| `sem_consolidacao` | Sem parcelamentos ativos |
| `listagem_timeout` | Timeout ao listar consolidacoes |
| `calculo_timeout` | Timeout no calculo da parcela |
| `download_timeout` | Timeout ao baixar PDF |
| `overlay_modal` | Modal/overlay bloqueando a UI |
| `portal_alerta` | Alerta/mensagem do portal |
| `erro_inesperado` | Falha nao classificada |

Fases: `login`, `listagem`, `modal`, `calculo`, `download`, `fechamento`, `geral`.

## Integracao com o app desktop

O app em `Parcelamentos/app` chama `runAutomation` de `src/automation.ts` via adapter AL:

- Planilha oficial validada na UI
- Pasta de downloads escolhida pelo usuario
- Progresso/cancelamento propagados para a interface
- Sem coleta de senha na tela (credenciais so na planilha)

## Operacao e cuidados

- Nao versionar planilhas com senhas reais
- Portal pode mudar locators/endpoints; preferir testes + smoke apos alteracoes
- HTTP depende de sessao/JWT validos e headers corretos
- Em producao, preferir Edge/Chrome estavel e pasta de saida com espaco em disco

## Comandos de referencia

```bash
npm run start -- --input ./EmpresasAlagoas.xlsx --output ./output/downloads
npm run start -- --input ./EmpresasAlagoas.xlsx --headed
npm run start:http -- --input ./EmpresasAlagoas.xlsx
npm run check
npm run test
npm run smoke:headed
```
