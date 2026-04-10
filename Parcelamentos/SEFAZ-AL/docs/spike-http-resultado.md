# Spike: automação só HTTP (SEFAZ-AL) — resultado

## Conclusão (viabilidade)

**VIÁVEL.** Validado com dados reais (DONA MARIA VARIEDADES LTDA, `numeroPessoa=5114260`): o fluxo completo — login → listar consolidações → calcular parcela → emitir DAR → baixar PDF — funciona **100% via HTTP**, sem browser.

PDF gerado: `output/spike/boleto-http-spike.pdf` (118 265 bytes, assinatura `%PDF` válida).

## Fluxo correto descoberto

### Endpoints (prefixo: `https://contribuinte.sefaz.al.gov.br/parcelamento`)

| # | Método | Endpoint | Observação |
|---|--------|----------|------------|
| 1 | POST | `/sfz-security-api/api/autenticar` | Corpo `{username, password, rememberMe:true}`; resposta: `{token}` |
| 2 | GET  | `/api/account` | Autenticado; retorna `{numeroPessoa, login, ...}` |
| 3 | POST | `/sfz-parcelamento-api/api/consolidacao/consultar` | Header **`x-pessoadetrabalho: {numeroPessoa}`**, body `{}` |
| 4 | GET  | `/sfz-parcelamento-api/api/parcelamento/gerar/{id}/1/{data}` | `id` = `consolidacao.id`; `data` = hoje `YYYY-MM-DD`; retorna cálculo |
| 5 | GET  | `/sfz-parcelamento-api/api/parcelamento/{id}/1/{data}` | Emite o DAR; retorna `{numeroProcessamento, dataVencimentoMaximo, ...}` |
| 6 | POST | `/sfz-parcelamento-api/api/dar/visualizar` | Corpo `{informacoesDar:[{numeroProcessamento, dataVencimento}]}`; `Accept: application/octet-stream`; resposta: PDF binário |

### Cabeçalhos obrigatórios em todas as chamadas autenticadas
- `Authorization: Bearer {token}` (JWT do passo 1)
- `x-pessoadetrabalho: {numeroPessoa}` (obtido no passo 2 via `/api/account`)

### Formato de `dataVencimento` (passo 6)
Extraído de `dataVencimentoMaximo` (passo 5), convertido para meia-noite no fuso `America/Maceio` (UTC-3):
```
"2026-04-30T23:59:59-03:00" → "2026-04-30T00:00:00-03:00"
```

### Descobertas durante o spike

| Hipótese inicial | Realidade confirmada |
|---|---|
| `numPessoa` como header do consultar | Header correto é `x-pessoadetrabalho` |
| `numeroPessoa` via `/sfz-pessoa-api/api/pessoa` | Vem diretamente de `GET /api/account` |
| PDF retornado pelo endpoint emitir | PDF vem de `POST /dar/visualizar` com `numeroProcessamento` |
| `dataPagamento=null` aceito | Obrigatório passar data real (`YYYY-MM-DD`) |
| Campo `sequencial` nas consolidações | Campo correto é `id` |
| Corpo com `numPessoa` no POST consultar | Body deve ser `{}` vazio |

## Riscos e limitações

- APIs **não documentadas** publicamente; mudanças no gateway podem quebrar o cliente HTTP.
- `numeroProcessamento` retorna `null` se o mesmo `consolidacaoId` é chamado repetidamente na mesma sessão (cache Redis). O script trata isso tentando uma consolidação alternativa.
- Filtro de situações ativas (DAR, CONFIRMADO, PARCELADO, ATRASO, SIMULACAO) precisa estar alinhado com o que o portal exibe.
- Empresas sem consolidações ativas (ex: CLORUS QUIMICA com situação CDA) retornam 404 ou lista vazia — tratado como saída limpa, sem erro.
- **Conformidade**: uso direto das APIs deve ser alinhado aos termos do portal.

## O que foi entregue na branch

| Artefato | Função |
|----------|--------|
| `npm run spike:capture -- --input ./EmpresasAlagoas.xlsx [--row N] [--headed]` | Playwright: login com planilha, fluxo até consolidações, grava `output/spike/network-capture.jsonl` (URLs/métodos/status/headers; corpos e tokens sensíveis redigidos). |
| `npm run spike:http -- --input ./EmpresasAlagoas.xlsx [--row N] [--consolidacao ID]` | PoC só com `fetch`: autentica, lista consolidações, calcula parcela, emite DAR e grava PDF em `output/spike/boleto-http-spike.pdf`. **Validado com dados reais.** |

## Próximos passos sugeridos

1. **Extrair cliente HTTP estável**: mover o fluxo do `spike:http` para um módulo dedicado (`src/http-client.ts`) substituindo ou convivendo com o Playwright.
2. **Processar múltiplas empresas**: adaptar o loop de `src/main.ts` para usar o cliente HTTP, com fallback para Playwright em caso de erro.
3. **Cache Redis**: se `numeroProcessamento` vier nulo (segunda chamada mesma consolidação), tentar a próxima consolidação ativa da lista (já implementado no PoC).
4. **Tratamento de situações**: alinhar o filtro `SITUACOES_ATIVAS` com o que o portal exibe por padrão (hoje: DAR, CONFIRMADO, PARCELADO, ATRASO, SIMULACAO).
