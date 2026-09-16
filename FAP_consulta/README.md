# Consulta Automatizada do FAP (Fator Acidentário de Prevenção)

CLI em TypeScript/Bun que utiliza o Certificado Digital e-CNPJ da Exatas Contabilidade para:

1. Autenticar no portal **FAP Dataprev** (`https://fap-mps.dataprev.gov.br`) via **Gov.br** com certificado digital e-CNPJ;
2. Carregar todas as **empresas com procuração / vinculação** eletrônica (via Gov.br e Dataprev);
3. Opcionalmente integrar e cruzar com o banco **Domínio Contábil** (ODBC Sybase SQL Anywhere);
4. Consultar os estabelecimentos (matriz e filiais) e obter os **cálculos detalhados do FAP** na vigência desejada (ex: 2026);
5. Exportar relatórios em **JSON**, **CSV** e planilha **XLSX** profissional com abas de Painel Geral, Cálculos do FAP, Empresas e Falhas.

A automação opera exclusivamente em modo leitura, sem realizar contestações ou alterações no portal.

---

## Requisitos

- Windows com Node.js 22, Bun 1.3 e Google Chrome instalados;
- Certificado digital e-CNPJ da Exatas Contabilidade em arquivo PFX/P12 (ou instalado no repositório pessoal do Windows);
- Procurações eletrônicas ativas concedidas pelos clientes.

---

## Configuração

Crie ou edite o arquivo `.env` na raiz do projeto com as seguintes variáveis:

```dotenv
CERT_PFX_PATH=./EXATAS CONTABILIDADE LTDA_27939154000108.pfx
CERT_PASSWORD=sua-senha-do-certificado
PROCURADOR_CNPJ=27939154000108

# Vigência do FAP (opcional: padrão é a vigência mais recente disponível)
FAP_ANO_VIGENCIA=2026

# Configurações de execução
OUTPUT_DIR=output
CAPTCHA_TIMEOUT_MS=300000
REQUEST_DELAY_MS=300
BROWSER_MODE=cdp

# Opcional: Integração com o Banco de Dados Domínio (ODBC)
DOMINIO_ODBC_DSN="Contabil Oficial"
DOMINIO_USER="EXTERNO"
DOMINIO_PASSWORD="externo"
DOMINIO_FILTER_ACTIVE=false
```

---

### 1. Seleção Automática do Certificado (Opcional, mas Recomendada)
Se a sua máquina possui certificados digitais de múltiplos clientes instalados no Windows, o Chrome exibirá por padrão uma janela pedindo para escolher qual certificado usar.

Para que o Chrome selecione **automaticamente e em silêncio** o certificado da **Exatas Contabilidade** sem abrir nenhuma janela modal, execute o script auxiliar uma única vez no **PowerShell como Administrador**:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configurar_certificado.ps1
```

Este script ativa a política oficial corporativa do Chrome (`AutoSelectCertificateForUrls`), cobrindo os portais do Gov.br, Dataprev (FAP), DET e SPE.

---

## Instalação e Execução

### 1. Instalar dependências
```powershell
bun install
```

### 2. Rodar testes unitários e typecheck
```powershell
bun test
bun run typecheck
```

### 3. Compilar TypeScript
```powershell
bun run build
```

### 4. Executar a consulta completa
```powershell
bun run start
```

### Opções de linha de comando:
- Limitar a quantidade de empresas:
  ```powershell
  bun run start -- --max 5
  ```
- Consultar apenas um CNPJ específico:
  ```powershell
  bun run start -- --cnpj 10766581000120
  ```
- Definir o ano de vigência:
  ```powershell
  bun run start -- --ano 2026
  ```

---

## Modo do Navegador (CDP Assistido)

Por padrão (`BROWSER_MODE=cdp`), o Google Chrome instalado na máquina é executado em um perfil temporário descartável. Isso garante:
- Resolução natural do hCaptcha invisível do Gov.br sem risco de bloqueio `ERL0033000`;
- Utilização automática do certificado digital e-CNPJ;
- Se o Gov.br exigir validação manual ou código de autorização, a janela do navegador estará visível para acompanhamento;
- Perfil temporário é apagado com segurança ao término da execução.

---

## Relatórios Gerados

A cada execução é gerada uma pasta `output/AAAA-MM-DD_HH-mm-ss/` contendo:

1. **`relatorio_fap.xlsx`**: Planilha Excel formatada profissionalmente contendo:
   - **Painel Geral**: Indicadores consolidados, ano de vigência, data de início da consulta FAP (`consultaCompetencia`), FAP médio, mínimo e máximo, total de estabelecimentos e empresas;
   - **Cálculos FAP**: Tabela completa com CNPJ, Razão Social, Início da Consulta (FAP), CNAE, FAP Final, FAP Original, Taxa de Rotatividade, Massa Salarial, Vínculos, CATs, B91, B92, B93, B94, Índices IF/IG/IC, percentis e flags de bloqueio;
   - **Empresas**: Lista de empresas pesquisadas, estabelecimentos encontrados e status;
   - **Falhas e Inconsistências**: Relação de empresas sem procuração ou com erro.
2. **`fap_calculos.csv`**: Base em CSV com `DATA_INICIO_CONSULTA_FAP`, delimitado por ponto-e-vírgula com BOM UTF-8 (compatível com Excel).
3. **`empresas.csv`**: Resumo de cada empresa/CNPJ Raiz pesquisado.
4. **`falhas.csv`**: Lista de empresas que apresentaram recusa de acesso ou erro de processamento.
5. **`execucao.json`**: Dados canônicos e métricas completas da execução.
6. **`run.log`**: Log detalhado da execução com higienização de senhas, JWTs e CPFs.
