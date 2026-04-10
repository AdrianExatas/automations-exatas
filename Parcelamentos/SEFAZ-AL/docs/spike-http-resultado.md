# Spike: automação só HTTP (SEFAZ-AL) — resultado

## Conclusão (viabilidade)

**Parcialmente viável e promissora.** O front-end (JHipster/Angular) chama APIs REST sob o prefixo `https://contribuinte.sefaz.al.gov.br/parcelamento/`, com autenticação por **JWT** retornado em `POST .../sfz-security-api/api/autenticar` (corpo `{ username, password, rememberMe }`, campo `token` na resposta de sucesso). As etapas de listagem/emissão expostas no bundle incluem:

- `GET .../sfz-pessoa-api/api/pessoa?numeroDocumento=...` → `numeroPessoa`
- `POST .../sfz-parcelamento-api/api/consolidacao/consultar` → lista de consolidações (corpo exato pode depender do perfil; o PoC tenta variantes)
- `GET .../sfz-parcelamento-api/api/parcelamento/gerar/{sequencial}/1/null` (cálculo)
- `GET .../sfz-parcelamento-api/api/parcelamento/{sequencial}/1/null` (PDF)

Isso indica que **não é obrigatório usar browser** para o happy path, desde que o JWT e os DTOs estejam corretos.

## Riscos e limitações

- APIs **não documentadas** publicamente; mudanças no gateway ou nos serviços podem quebrar o cliente HTTP.
- O corpo de `consolidacao/consultar` no Angular usa, em um fluxo, `obterParametrosIpva()` (`placa`/`renavam` da sessão); contribuintes com login usuário/senha podem exigir outro shape — o PoC tenta `numPessoa` e `placa`/`renavam` nulos. Ajuste fino deve usar o log de `npm run spike:capture`.
- Possíveis **regras de negócio** (situação da consolidação, recaptcha em alguns fluxos) não foram validadas em todos os cenários.
- **Conformidade**: uso direto das APIs deve ser alinhado aos termos do portal.

## O que foi entregue na branch

| Artefato | Função |
|----------|--------|
| `npm run spike:capture -- --input ./EmpresasAlagoas.xlsx [--row N] [--headed]` | Playwright: login com planilha, fluxo até download, grava `output/spike/network-capture.jsonl` (URLs/métodos/status; corpos e headers sensíveis redigidos). |
| `npm run spike:http -- --input ./EmpresasAlagoas.xlsx [--row N] [--sequencial S]` | PoC só com `fetch`: autentica, consulta pessoa, lista consolidações, gera parcela e grava PDF em `output/spike/boleto-http-spike.pdf` (ou `--out`). |

## Próximos passos sugeridos

1. Rodar `spike:capture` com uma empresa real e confirmar no JSONL o corpo exato de `consolidacao/consultar` e eventuais headers extras.
2. Se `spike:http` falhar só no `consultar`, alinhar o corpo ao registro da captura e remover tentativas redundantes no PoC.
3. Só então extrair um cliente HTTP estável (módulo dedicado) e decidir se convive com Playwright como fallback.
