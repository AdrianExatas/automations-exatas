# Mapa HTTP — Demonstrativo ICMS Antecipado (portal novo)

## Status (mTLS + UI #servico)

| Item | Status |
|------|--------|
| Login mTLS HTTP (`certificado/login.aspx`) | Preferencial (padrao XML-TS) |
| Playwright Portal Fazendario | Fallback se mTLS/legado incompatível |
| UI `#servico` contentFrame | Fallback tecnico por empresa |
| Reopen menu | So apos PDF/XLS **com sucesso** |
| Sem dados | Sem reopen; segue no mesmo form |
| Summary local | `scripts/har/demonstrativo-xls-summary.json` |

Fluxo:

1. Tentar `loginComCertificado` → `portal.jsp` → form `T34693` (paridade XML-TS: form `usuariosCadastrados` / auto-submit / redirects JS)
2. Se ok: listar + baixar so via HTTP (POST process.jsp + Jasper/Downloader)
3. Se incompatível (comum com Keycloak/portal novo): Playwright login → adotar cookies → HTTP se possível; senao UI `#servico`
4. “Sem dados”: erro de negocio, proximo item sem reopen
5. Sucesso UI: clicar menu Demonstrativo de novo (como na gravacao)

**Nota:** a URL OIDC Keycloak (`portal.apps.sefaz.se.gov.br/auth/realms/fazendario/...`) nao e automatizada por HTTP puro (PKCE); nesse caso o login e Playwright e o download continua HTTP.

## Como gerar o summary

Rodar o desktop normalmente; ao listar empresas (contrato DOM) ou no primeiro Ok UI o app grava:

```text
DEMONSTRATIVO/scripts/har/demonstrativo-xls-summary.json
```

```powershell
cd SEFAZ-SE\DIA\DEMONSTRATIVO
bun run probe:har
```

## Campos do formulario

| Campo | ID/name | Valores |
|-------|---------|---------|
| Contribuinte | `cdPessoaLookup` | inscricao |
| Mes | `nrMesDia` / `select[name=nrMesDia]` | `01`..`12` |
| Ano | `nrAno` | ex. `2026` |
| Formato | `tpFormato` | `0` PDF, `1` EXCEL |
| Transacao | `TransId` | `T34693` |
| App | `AppName` | `SIT` |

## PDF / XLS

- PDF HTTP: GET `.../JasperPDF.jsp?AppName=SIT&TransId=T34693`
- XLS HTTP: POST → `Downloader.jsp?Arquivo=...`
- Submit: `https://security.sefaz.se.gov.br/internet/process.jsp`

## Codigo

- MTLS: [`sefaz-demonstrativo-mtls.ts`](../src/sefaz-demonstrativo-mtls.ts)
- Fachada: [`demonstrativo-portal.ts`](../src/demonstrativo-portal.ts)
- UI: [`playwright-fallback.ts`](../src/playwright-fallback.ts) (`#servico`)
- API request (sessao PW): [`sefaz-demonstrativo-api.ts`](../src/sefaz-demonstrativo-api.ts)

## Checklist

- [x] Login mTLS HTTP primeiro (padrao XML-TS)
- [x] UI prefere iframe `#servico`
- [x] Reopen so apos sucesso; sem dados sem reopen
- [x] PDF/XLS via Jasper/Downloader
- [x] Relatorio marca `via: http | playwright`
