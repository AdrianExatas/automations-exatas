# xml-relatorio-excel

Ferramenta em TypeScript que lê um diretório de arquivos **XML de NFSe** (tomados), normaliza os dados em um modelo interno, gera uma planilha **Excel** alinhada ao fluxo Unecont e grava um **relatório JSON** com resumo e erros por arquivo.

## O que faz

1. **Lista** todos os arquivos `.xml` em uma pasta de entrada (ordem alfabética por nome).
2. **Identifica o schema** pela tag raiz e extrai campos de prestador, tomador, serviço, valores e datas.
3. **Valida** campos mínimos e valor do serviço; XMLs inválidos entram no relatório como `skipped` sem interromper o lote.
4. **Enriquece** linhas com CNAE e descrições a partir de um **mapa de itens de serviço** (planilha Excel).
5. **Resolve** municípios (código IBGE → nome e UF) usando `src/data/municipios-ibge.json`.
6. **Grava** primeiro um workbook “cru” com `xlsx`, depois **reformata** com o módulo compartilhado `formatDownloadedReport` (mesmo pipeline dos downloads Unecont), usando um **modelo Excel** e o mesmo mapa de serviços.
7. **Exporta** um arquivo JSON com estatísticas e detalhes por arquivo (convertidos, avisos, falhas).

## Requisitos

- **Node.js** (recomendado LTS), com dependências instaladas nesta pasta (`npm install`).
- **Layout do repositório Unecont**: este pacote importa `../../src/report-formatter` em relação a `xml-relatorio-excel/src/`, ou seja, deve existir `Unecont/src/report-formatter.ts` ao lado da pasta `xml-relatorio-excel`. Abrir ou publicar só esta subpasta sem o restante do Unecont quebra a conversão na etapa de formatação.
- **Arquivos opcionais por padrão** (veja caminhos abaixo): modelo `.xlsx` e planilha de mapeamento de serviços. Se não existirem nos caminhos padrão, use `--template-path` e `--service-map-path`.

## Instalação

Na pasta `xml-relatorio-excel`:

```bash
npm install
```

## Uso pela linha de comando

O script definido em `package.json` é `xml-to-excel`:

```bash
npm run xml-to-excel -- --input-dir "C:\caminho\para\xmls"
```

Com **npm**, os argumentos após `--` são repassados ao `tsx`.

### Parâmetros

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `--input-dir` | Sim | Pasta que contém apenas os `.xml` a processar (não varre subpastas). |
| `--output-file` | Não | Caminho do `.xlsx` final. Padrão: `saida/relatorio-unecont-<timestamp>.xlsx` dentro deste pacote. |
| `--error-report-file` | Não | Caminho do JSON de relatório. Padrão: mesmo diretório e nome base do Excel, extensão `.json`. |
| `--template-path` | Não | Modelo Excel usado pela formatação. Padrão: `../assets/templates/report-layout-example.xlsx` (relativo à raiz deste pacote → pasta `Unecont/assets/...`). |
| `--service-map-path` | Não | Planilha de mapeamento item → CNAE / descrição. Padrão: `../assets/mappings/service-item-map.xlsx`. |

Ao terminar, o programa imprime no **stdout** um JSON com caminhos absolutos de saída e o objeto `summary`.

### Exemplo

```bash
npm run xml-to-excel -- --input-dir "./entrada/nfse" --output-file "./saida/relatorio.xlsx"
```

## Uso como biblioteca

O arquivo `src/index.ts` exporta:

- `convertNfseXmlDirectory(options)` — função principal de conversão.
- Tipos: `CanonicalNfseRow`, `ConversionResult`, `ConvertNfseXmlDirectoryOptions`, `ParsedNfseDocument`, entre outros.

Exemplo mínimo:

```ts
import { convertNfseXmlDirectory } from "xml-relatorio-excel"; // ou caminho relativo ao seu bundler

const result = await convertNfseXmlDirectory({
  inputDir: "/caminho/dos/xml",
  outputFile: "/caminho/saida.xlsx",
  errorReportFile: "/caminho/saida.json",
  templatePath: "/caminho/modelo.xlsx",
  serviceMapPath: "/caminho/service-item-map.xlsx",
});

console.log(result.summary, result.items);
```

*(O nome do pacote em `package.json` é `xml-relatorio-excel`; para importar de outro projeto na mesma árvore, configure o `package.json` do consumidor ou use caminhos relativos/tsconfig paths.)*

## XML suportados

O parser infere o schema pela **raiz do documento**:

| Schema | Raízes reconhecidas (trecho) | Observação |
|--------|------------------------------|------------|
| **ABRASF 2.x** | `CompNfse`, `GerarNfseResposta` (com `CompNfse` aninhado) | Layout clássico ABRASF. |
| **NFSe Nacional 1.01** | `NFSe` | Estrutura com `infNFSe` / `DPS` / `infDPS`. |

Qualquer outra raiz gera erro do tipo *Schema de XML não suportado*.

## Planilha de mapa de serviços (`service-item-map`)

Carregada por `src/mappings/service-map.ts` a partir da **primeira aba**:

- Coluna 0: CNAE  
- Coluna 1: descrição do CNAE  
- Coluna 2: código do item (serviço federal / lista — normalizado internamente)  
- Coluna 3: descrição do serviço  

Se houver mais de um CNAE ou mais de uma descrição para o mesmo item, o sistema marca **ambiguidade** e preenche avisos na linha correspondente.

## Saídas

- **Excel**: colunas alinhadas ao relatório Unecont (após formatação com `exceljs` no `report-formatter`), incluindo campos como CNPJ formatado, municípios, regime tributário, valores e flags como serviço dentro/fora do município.
- **JSON** (`errorReportFile`): estrutura `ConversionResult` com `summary` (`totalFiles`, `convertedFiles`, `skippedFiles`, `warningCount`, `errorCount`) e `items[]` por arquivo (`converted` | `skipped`, `warnings`, `message` em caso de falha).

## Testes

```bash
npm test
```

Os testes de integração de `convertNfseXmlDirectory` esperam os arquivos de **modelo** e **mapa** em `../../assets/...` (a partir de `src/`), ou seja, os mesmos caminhos padrão da CLI em um checkout completo do Unecont. Sem esses arquivos, esse caso de teste pode falhar.

## Estrutura do código (resumo)

| Caminho | Função |
|---------|--------|
| `src/cli/run.ts` | CLI: parse de flags e chamada à conversão. |
| `src/convert.ts` | Orquestra leitura do diretório, parse, validação, workbook e formatação. |
| `src/xml/parse-documents.ts` | Parse streaming (`saxes`) e mapeamento ABRASF / Nacional. |
| `src/xml/xml-tree.ts` | Utilitários de árvore XML. |
| `src/excel/raw-workbook.ts` | Geração da planilha inicial com `xlsx`. |
| `src/mappings/service-map.ts` | Leitura do Excel de itens. |
| `src/mappings/municipios.ts` | Resolução de município IBGE. |
| `src/utils.ts` | Normalização de código de serviço, CPF/CNPJ, datas, decimais. |

## Dependências principais

- **saxes** — parse XML em streaming.  
- **xlsx** — escrita da planilha bruta e leitura do mapa de serviços.  
- **exceljs** — usada indiretamente pelo formatador em `Unecont/src/report-formatter.ts`.  

---

Em caso de dúvida sobre colunas do modelo final ou validações pós-formatação, consulte também `Unecont/src/report-formatter.ts` e seus testes em `Unecont/src/report-formatter.test.ts`.
