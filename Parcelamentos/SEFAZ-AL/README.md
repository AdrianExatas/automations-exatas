# Parcelamentos SEFAZ-AL

Automacao em TypeScript + Playwright para baixar o boleto atual de todos os parcelamentos ativos no portal da SEFAZ-AL.

Tambem existe um modo HTTP (`npm run start:http`) com fallback para navegador quando a emissao via API falha.

## Entrada (planilha oficial)

Use o modelo alinhado a `EmpresasAlagoas.xlsx`. A primeira aba precisa conter:

| Coluna | Obrigatoria | Descricao |
|--------|-------------|-----------|
| `CODIGO` | recomendado | Identificador interno da empresa |
| `EMPRESA` | sim | Nome da empresa |
| `CNPJ` | recomendado | CNPJ da empresa |
| `USUARIO` | sim | Login do portal SEFAZ-AL |
| `SENHA` | sim | Senha do portal |
| `OBSERVAÇÃO` | nao | Texto livre |

O leitor aceita planilhas com colunas extras, desde que `EMPRESA`, `USUARIO` e `SENHA` estejam preenchidas.

Modelo de referencia no app unificado: `../app/templates/modelo-al.xlsx`.

## Instalacao

```bash
npm install
npm run chrome:install
```

## Execucao (navegador)

Padrao (`model.xlsx` ou informe `--input`):

```bash
npm run start -- --input ./EmpresasAlagoas.xlsx --output ./output/downloads
```

Com navegador visivel:

```bash
npm run start -- --input ./EmpresasAlagoas.xlsx --headed
```

### Argumentos CLI

| Argumento | Padrao | Descricao |
|-----------|--------|-----------|
| `--input` | `model.xlsx` | Planilha de entrada |
| `--output` | `output/downloads` | Pasta base dos PDFs |
| `--headed` | off | Mostra o Chrome durante a execucao |

## Execucao (HTTP)

```bash
npm run start:http -- --input ./EmpresasAlagoas.xlsx --output ./output/downloads
```

O modo HTTP autentica e emite via API. Se a emissao HTTP falhar em uma consolidacao, pode recorrer ao fluxo de navegador (fallback).

## Saidas

### PDFs

Salvos em pastas por execucao e empresa, no formato:

```text
output/downloads/<timestamp>/EMPRESA/PARCELAMENTO N° <CONSOLIDACAO>/PARCELA N°<emitida> DE <total> - <CONSOLIDACAO>.pdf
```

### Relatorio

Arquivo XLSX em `output/resultado-<timestamp>.xlsx` com status, consolidacao, parcela, vencimento, caminho do PDF e categorias de erro.

## App desktop

No aplicativo unificado (`../app`):

1. Aba **Alagoas**
2. Baixar modelo (ou usar `EmpresasAlagoas.xlsx`)
3. Selecionar a planilha preenchida
4. Escolher pasta de downloads
5. Iniciar download

Credenciais ficam **somente na planilha**.

## Testes

```bash
npm run check
npm run test
npm run smoke:headed
```

Smoke test exige `SEFAZ_AL_USUARIO` e `SEFAZ_AL_SENHA` (opcional: `SEFAZ_AL_CONSOLIDACAO`).

## Documentacao adicional

- [Fluxo tecnico da automacao](docs/automacao.md)
- [Spike HTTP — viabilidade e endpoints](docs/spike-http-resultado.md)
