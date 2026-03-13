# SIEG Certificado – Cadastro/Atualização de Certificado Digital (TypeScript)

Integração com a [API SIEG](https://api.sieg.com/swagger/ui/index) para **cadastro e atualização de certificado digital** (PFX). A API Key é lida do arquivo `.env`.

## Arquitetura

O projeto está organizado em módulos:

- **`src/server.ts`** – Servidor HTTP que roteia requisições para a API e arquivos estáticos.
- **`src/routes/certificado.ts`** – Handlers das rotas da API (listar, registrar, editar, habilitar, desabilitar, status).
- **`src/routes/static.ts`** – Serviço de arquivos estáticos da pasta `public/`.
- **`src/client.ts`** – Cliente da API SIEG (uso em CLI e em código).
- **`src/utils/logger.ts`** – Logger configurável (verbosidade via `DEBUG`).
- **`src/utils/validation.ts`** – Validação (CNPJ, etc.).
- **`src/utils/http.ts`** – Respostas HTTP padronizadas e parsing de corpo/query.
- **`src/utils/multipart.ts`** – Parsing de `multipart/form-data` (upload de PFX).
- **`src/extrair-cnpj-pfx.ts`** – Extração de CNPJ a partir do arquivo PFX.

## Requisitos

- **Node.js 18+** (usa `fetch` nativo)
- Arquivo `.env` com `SIEG_API_KEY`

## Instalação

```bash
cd SIEG_Certificado
npm install
npm run build
```

## Configuração

No `.env` na raiz do projeto:

```env
# Obrigatório
SIEG_API_KEY=sua_chave_aqui

# Opcional: base da API (padrão: https://api.sieg.com)
# SIEG_API_BASE_URL=https://api.sieg.com

# Opcional: base dos endpoints de Certificado (padrão: api/Certificado)
# SIEG_CERTIFICADO_BASE=api/Certificado

# Opcional: timeout em segundos
# SIEG_REQUEST_TIMEOUT=30

# Opcional: ativar logs detalhados (qualquer valor não vazio)
# DEBUG=1
```

Endpoints disponíveis: **ListarCertificados**, **Registrar**, **Editar**, **habilitar**, **desabilitar**, **status**. A URL base usa `api/Certificado` por padrão (ex.: `https://api.sieg.com/api/Certificado/ListarCertificados`). Confira o [Swagger](https://api.sieg.com/swagger/ui/index) se precisar ajustar `SIEG_CERTIFICADO_BASE` no `.env`.

## Interface web

Uma interface web permite enviar o certificado pelo navegador:

```bash
npm run build
npm run server
```

Acesse **http://localhost:3000**. A interface oferece abas para: **Listar** certificados, **Registrar** (arquivo .pfx + senha), **Editar** (por CertificadoId), **Habilitar**, **Desabilitar** e **Status**.

- **Porta:** altere com a variável de ambiente `PORT` (ex.: `PORT=8080 npm run server`).
- Para compilar e subir o servidor em um comando: `npm run web`.

## Uso

### Linha de comando

```bash
# Modo interativo (pede caminho do PFX e senha)
npm run dev
# ou após build:
node dist/atualizar-certificado.js

# Com argumentos
node dist/atualizar-certificado.js "C:\caminho\certificado.pfx" --senha "sua_senha"

# Com CNPJ (se a API exigir)
node dist/atualizar-certificado.js "C:\caminho\certificado.pfx" --senha "sua_senha" --cnpj 12345678000199
```

Atalho após `npm run build`:

```bash
npm run certificado -- "C:\caminho\certificado.pfx" --senha "sua_senha"
```

### Em código

```typescript
import { SiegCertificadoClient } from "./client.js";

const client = new SiegCertificadoClient(); // usa SIEG_API_KEY do .env
const [ok, msg] = await client.cadastrarAtualizarCertificado(
  "caminho/para/certificado.pfx",
  "senha_do_certificado",
  "12345678000199" // cnpj opcional
);
if (ok) console.log("Sucesso:", msg);
else console.error("Erro:", msg);
```

## Scripts npm

| Script        | Descrição                          |
|---------------|------------------------------------|
| `npm run build` | Compila TypeScript para `dist/`  |
| `npm run server` | Sobe a interface web (após build); padrão http://localhost:3000 |
| `npm run web` | Compila e sobe o servidor web      |
| `npm start`   | Roda o CLI (após build)            |
| `npm run certificado` | Idem, com args: `npm run certificado -- arquivo.pfx --senha x` |
| `npm run dev` | Roda o CLI com tsx (sem build)     |

## Ajuste ao Swagger

Se a API usar outros nomes de parâmetros ou outro endpoint:

1. Abra https://api.sieg.com/swagger/ui/index e localize o recurso de **Certificado**.
2. Veja o **path** (ex.: `/api/v1/Certificado`) e defina no `.env`:  
   `SIEG_CERTIFICADO_BASE=api/v1/Certificado` (ou o path indicado).
3. Em **`src/client.ts`**, no método `cadastrarAtualizarCertificado`, altere o objeto `payload` para os nomes de campos que o Swagger indicar.
4. Para a interface web (upload, listar, editar, etc.), os handlers estão em **`src/routes/certificado.ts`**; ajuste payloads e rotas conforme o Swagger.

## Git – Checklist rápido

1. `git status`
2. `git checkout -b feat/sieg-certificado-ts`
3. Aplicar alterações
4. `git add -A && git commit -m "feat: cliente e CLI TypeScript para certificado SIEG"`
5. Testar: `npm run build && npm run certificado -- --help` (ou passando um .pfx de teste)
6. Rollback: `git checkout main` ou `git reset --hard HEAD~1`
