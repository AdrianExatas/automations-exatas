# Uso da API local (porta 3001) e lacunas da API Gestta

Este documento consolida: (1) rotas da API local que podem enriquecer a automação Alterar-responsavel, (2) campos reaproveitáveis e (3) o que ainda falta descobrir na API do Gestta.

A API na porta 3001 pertence ao projeto **Comparar Adiantamentos Liquidos Domínio - Onvio** (Node/Express sobre Postgres). O banco está em outra porta (ex.: 5433); a 3001 é apenas o HTTP.

---

## 1. Rotas locais (porta 3001) que vale consultar

| Rota | Uso na automação Alterar-responsavel |
|------|--------------------------------------|
| `GET /api/companies?limit=N&offset=0` | Resolver **cliente Gestta** por CNPJ: usar `gestta_id` quando a planilha tiver CNPJ e você quiser validar/cachear antes de chamar a API do Gestta. |
| `GET /api/companies/:onvioId` | Buscar uma empresa específica por `onvio_id` (se no fluxo você tiver só o ID Onvio). |
| `GET /api/departments?limit=N&offset=0` | Conferir **nomes de setor/departamento** aceitos pelo sistema (Fiscal, Pessoal, etc.) para normalizar a coluna SETOR da planilha. |
| `GET /api/employees?limit=N&offset=0` | Cruzar **funcionários** (nome, departamento) se a API local tiver dados que batam com os responsáveis da planilha. |
| `GET /api/tasks?limit=N&offset=0` | Ver **payload bruto** das tarefas (incl. `company_department`, `group_customer_count`) para entender estrutura; **não** substitui a descoberta dos `ids` do PATCH. |
| `GET /api/sync-runs` | Saber qual foi o último run de sync e se os dados em companies/departments/tasks estão atualizados. |

**Base URL:** `http://localhost:3001` (sem autenticação nas rotas testadas).

---

## 2. Campos dos retornos que podem ser reaproveitados no Alterar-responsavel

### `/api/companies` (cada item)
- **`gestta_id`** → usar como `customerId` nas chamadas Gestta (`/admin/customer/:customerId/...`, task-gen, etc.).
- **`cnpj`** → normalizar (só dígitos) e comparar com a coluna CNPJ da planilha para achar a empresa certa.
- **`onvio_id`**, **`external_id`** → se no futuro precisar cruzar com Onvio.

### `/api/departments` (cada item)
- **`name`** → lista canônica de nomes de setor; usar para normalizar/validar a coluna SETOR (e o filtro por departamento em `getGroupCustomerIds`).
- **`department_id`** → ID no sistema de sync; não é o `company_department._id` do Gestta, mas ajuda a manter consistência interna.

### `/api/tasks` (cada item)
- **`payload.company_department._id`** → ID do departamento no Gestta.
- **`payload.company_department.name`** → nome do setor no Gestta (útil para o filtro por setor em `getGroupCustomerIds`).
- **`payload.group_customer_count`** → apenas indicativo de quantidade; **não** são os `ids` do PATCH.

### `/api/employees` (se existir e tiver nome/id)
- Nome do responsável → validar/normalizar contra a coluna RESPONSÁVEL da planilha antes de chamar `buscarUsuarioPorNome` na API Gestta.

**Resumo:** a API 3001 serve hoje principalmente para **validar/cachear** `(CNPJ → gestta_id)` e **normalizar nomes de setor** com base em companies e departments; o resto do fluxo continua dependendo da API do Gestta.

---

## 3. O que ainda falta descobrir na API do Gestta

- **Origem dos `ids` do `PATCH /admin/group/customer/config`:**
  - Confirmar se vêm de `GET /admin/customer/:customerId/company/task` (os `_id` dos itens) ou de outro endpoint (ex.: `GET /admin/group/customer?customer=:customerId` ou análogo).
  - Hoje o código usa `company/task` e envia esses `_id` no PATCH; isso **não está provado** com sucesso real do PATCH.

- **Causa do 404 em alguns clientes:**
  - Saber em qual chamada ocorre: listar cliente, `company/task`, PATCH, DELETE task-gen ou POST task-gen.
  - Pode ser cliente sem `gestta_id`, recurso inexistente para aquele cliente ou path/query incorreto.

- **Contrato exato do PATCH:**
  - Tipo de ID esperado em `ids[]` (ex.: `group_customer._id` vs vínculo `customer_company_task._id`).
  - Se existe filtro por setor/departamento na própria API (query params) ou se isso é só no cliente (filtro em cima de `company/task`).

- **Paginação de `GET /admin/company/user`:**
  - Se a API do Gestta pagina esse endpoint; hoje o Alterar-responsavel não pagina e pode não achar o responsável se houver muitos usuários.

- **Evidência de rede da UI:**
  - Captura (DevTools → Network) no momento em que o usuário abre a empresa, filtra por setor e altera o responsável, para ver qual GET devolve os IDs que o front envia no PATCH.
