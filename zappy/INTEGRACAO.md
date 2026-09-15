# Integração Zappy / ZapContábil (Exatas) — envio de documentos

Guia validado contra a instância real da Exatas em **2026-09-08**.  
Swagger: [https://api-exatas.zapcontabil.chat/api-docs/](https://api-exatas.zapcontabil.chat/api-docs/)

Uso principal: ferramenta interna que envia documentos (PDF etc.) aos clientes via WhatsApp.

---

## 1. Objetivo

1. Autenticar na API da instância **Exatas**.
2. Localizar o cliente (contato WhatsApp).
3. Enviar texto e/ou documento pela conexão **Operação**.
4. (Opcional) Confirmar entrega / ticket via GET.

Webhooks do painel (Innov Talk / Innov2) servem para **receber** eventos. O envio é sempre **REST**.

---

## 2. Host e autenticação

| Item | Valor correto |
|---|---|
| Base URL | `https://api-exatas.zapcontabil.chat` |
| Header | `Authorization: Bearer <chave>` (`Bearer` com B maiúsculo) |
| Accept | `application/json` |
| Onde gerar a chave | Configurações → Integração → Chaves de API |

**Não usar** `https://api-zapcontabil.zapcontabil.chat` — a mesma chave retorna `401 ERR_INVALID_API_KEY` lá. A URL correta aparece no iframe ZappyDocs (`zappyUrl=https://api-exatas.zapcontabil.chat`).

Erros de auth observados:

| Situação | Erro |
|---|---|
| Sem header | `ERR_NO_AUTH_HEADER_PRESENT` |
| Esquema ≠ `Bearer` | `ERR_INVALID_AUTH_SCHEME` |
| Chave/host errados | `ERR_INVALID_API_KEY` |

Variáveis sugeridas na ferramenta interna:

```env
ZAPPY_BASE_URL=https://api-exatas.zapcontabil.chat
ZAPPY_API_KEY=<chave>
ZAPPY_CONNECTION_ID=1
```

Local (não versionar): `.env` com `zappy_api_key=...`.

---

## 3. Conexão WhatsApp validada

`GET /api/connections` → **200**

| Campo | Valor |
|---|---|
| `id` | `1` |
| `name` | Operação |
| `status` | `CONNECTED` |
| `type` | `whatsapp` |
| `connectionSubType` | `whatsmeow` |
| `number` | `557931420075` |

Implicações:

- Usar `connectionFrom: 1` nos envios.
- **Não é API Oficial da Meta** → templates oficiais não se aplicam.
- `GET /api/connections/1/templates` → **404** `Connection is not whatsapp oficial`.
- `GET /api/tickets/{id}/info` confirma `isWhatsappOficial: false`.

Health check recomendado: se `status != CONNECTED`, abortar o envio.

---

## 4. Catálogo validado (leitura)

Resultados desta instância (amostra pequena; sem dumps de PII). Script local: `probe_api.py` / artefato `api_probe_results.json`.

### 4.1 Conexões

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/api/connections` | 200 | 1 conexão |
| GET | `/api/connections/1/templates` | 404 | Só para `whatsapp-oficial` |

### 4.2 Contatos

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/api/contacts?page=&pageSize=` | 200 | Paginação |
| GET | `/api/contacts/{id}` | 200 | Detalhe + `numberFormatted`, `wbotTo`, `baileysTo` |

Peculiaridades:

- `count` reportado: **20145**, mas a paginação completa só entregou **3254** contatos únicos (incluindo ~147 grupos). Use o que as páginas devolvem, não o `count`.
- `pageSize=1000` funciona (Swagger fala em máx. 100; a instância aceitou 1000).
- Contato de teste: id **1229**, `ADRIAN HAELISSON - FUNCIONARIO`, `5579998242555`.

Campos úteis: `id`, `name`, `number`, `email`, `isGroup`, `blocked`, `tags`, `userId`, `queueId`.

Export local (não commit): `contacts.csv`, `contacts.json`.

### 4.3 Tickets / atendimentos

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/api/tickets?page=&pageSize=` | 200 | ~66k tickets; paginar |
| GET | `/api/tickets/{id}` | 200 | Detalhe |
| GET | `/api/tickets/{id}/info` | 200 | Janela / oficial flags |
| GET | `/api/tickets/search-by-contact?contactNumber=` | 200 | Também devolve `contact` no meta |

Exemplo Adrian: 38 tickets; após envio de teste o ticket **66740** ficou `pending`.

### 4.4 Mensagens

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/api/messages?page=&pageSize=` | 200 | Volume alto (~756k) |
| GET | `/api/messages?contactId=` | 200 | Filtrar por contato |
| GET | `/api/messages/{id}` | 200 | Detalhe |

`ack`: 0 não entregue, 1 enviada, 2 no dispositivo, 3 lida.

### 4.5 Setores, usuários, tags

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/api/queues` | 200 | 14 setores |
| GET | `/api/queues/{id}` | 200 | Ex.: Financeiro |
| GET | `/api/queue-users` | 200 | Lista usuários por setor |
| GET | `/api/users` | 200 | 54 usuários |
| GET | `/api/users/{id}` | 200 | Detalhe |
| GET | `/api/tags` | 200 | 52 tags |
| GET | `/api/tags/{id}` | 200 | Ex.: CLIENTE PREMIUM |

### 4.6 Dashboard e métricas

Datas: `startDate` / `endDate` (ou `dateFrom` / `dateTo` em metrics) no formato `YYYY-MM-DD`.

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/api/dashboard/tickets-por-atendente` | 200 | Requer `startDate`, `endDate` |
| GET | `/api/dashboard/tickets-por-qualificacao` | 200 | Idem |
| GET | `/api/dashboard/tickets-agrupados` | 200 | Query **`dimensao`** (não `groupBy`) |
| GET | `/api/metrics/messages` | 200 | `messages`, `avgResponseTime` |

Valores aceitos de `dimensao`: **`tag`**, **`setor`**, **`mes`**, **`dia`**.  
Outros valores → `400 Parametro dimensao invalido`.

### 4.7 Storage

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/api/storage/signed-url/{filekey}` | 200 | URL assinada temporária |

`fileKey` vem de mensagens com mídia.

### 4.8 Webhooks via API

| Método | Path | Status | Notas |
|---|---|---|---|
| GET | `/api/webhooks` | 200* | *Resposta é fallback `{status:true, version:...}` — **não lista** webhooks |

No painel existem webhooks (Innov Talk / Innov2). Com esta chave/rota, a gestão prática continua pelo **painel**. Assinatura esperada nas entregas: `X-Jupiter-Signature: sha256=<hash>`.

---

## 5. Envio (validado com número de teste)

Número autorizado nos testes: **5579998242555** (Adrian Haelisson).

### 5.0 Persistência no Zappy (crítico)

O painel do Zappy só mostra o que está **gravado no ticket**. Um `POST` pode devolver `200` e o WhatsApp receber a mensagem **sem** a mensagem existir em `GET /api/messages/{id}`.

Caso observado (Adrian):

| Envio | WhatsApp | Zappy |
|---|---|---|
| 3 textos com `ticketStrategy: "nocreate"` | Chegaram | **Não** — `GET /api/messages/{id}` → **404 Message not found**; ticket listava só o PDF |
| 1 PDF (`/api/send/document/...`) | Chegou | **Sim** |
| 1 texto **sem** `ticketStrategy` (padrão `create`) | Chegou | **Sim** — id `3EB00C23A52AE03F9533C3`, `GET` 200, listado no ticket `#66740` |

**Regra:** para a mensagem aparecer na interface, **não use `nocreate`**. Use o padrão (`create`) ou `reuseOrClose` se quiser reaproveitar ticket aberto.

Após cada envio:

```
POST → response.message.id / ticketId
GET /api/messages/{id}  → deve ser 200
se 404 → falha de auditoria (não marque como “visível no Zappy”)
```

Produto: **1 intenção = 1 POST**. O script `probe_api.py` em modo `sends` só sob demanda (gera WhatsApp de verdade).

### 5.1 Texto

```http
POST /api/send/5579998242555
Authorization: Bearer {ZAPPY_API_KEY}
Content-Type: application/json

{
  "body": "Segue o documento solicitado.",
  "connectionFrom": 1
}
```

Não enviar `ticketStrategy: "nocreate"` se a mensagem precisa aparecer no Zappy.

**Resultado com persistência (sem nocreate):** HTTP **200**, depois `GET /api/messages/3EB00C23A52AE03F9533C3` → **200**, `ack: 2`, presente em `GET /api/messages?ticketId=66740`.

Corpo encapsulado do POST:

```json
{
  "message": {
    "id": "3EB00C23A52AE03F9533C3",
    "body": "[TESTE PERSISTENCIA] sem nocreate",
    "type": "text",
    "subtype": "text",
    "contactId": 1229,
    "ticketId": 66740
  }
}
```

Na ferramenta, leia `response.message.id` e `response.message.ticketId`, e **confirme** com GET.

### 5.2 Documento (PDF)

```http
POST /api/send/document/{numero}
Authorization: Bearer {ZAPPY_API_KEY}
Content-Type: multipart/form-data

media=<arquivo.pdf>
connectionFrom=1
```

Alternativa JSON (arquivo já público):

```json
{
  "url": "https://seu-sistema/arquivos/guia.pdf",
  "connectionFrom": 1
}
```

**Resultado observado (multipart):** HTTP **200**. Documento persistiu no ticket mesmo quando testamos com `nocreate` no multipart; ainda assim, para consistência, **não use `nocreate`**.

| Campo | Valor (teste) |
|---|---|
| `id` | `3EB0B6E668E31CE4841C4C` |
| `mediaType` | `document` |
| `ack` | `2` |
| `ticketId` | `66740` |
| `body` | `test_doc.pdf` |

### 5.3 `ticketStrategy`

Valores: `create` (padrão), `nocreate`, `close`, `reuseOrClose`.

| Valor | Uso recomendado |
|---|---|
| omitir / `create` | Mensagem deve aparecer no Zappy (padrão da ferramenta) |
| `reuseOrClose` | Reaproveitar ticket aberto sem espalhar tickets |
| `nocreate` | **Evitar** se precisar de histórico na interface — texto pode ir ao WhatsApp e **não** persistir |
| `close` | Só se a regra de negócio for criar e fechar |

### 5.4 Outros tipos de mídia

`POST /api/send/{type}/{to}` com `type` ∈ `image` | `video` | `audio` | `voice` | `document`.

`caption` no schema aplica-se a **imagem**, não a documento.

### 5.5 O que não testamos de propósito

Writes destrutivos em produção: PUT/DELETE contatos/tags/filas/webhooks, `transfer`, `resolve`, `send-and-close`, `send-template-bulk`, criação em massa de filas/contatos.

---

## 6. Fluxo sugerido na ferramenta interna

```
Cliente (CNPJ / código interno)
        │
        ▼
Resolver telefone (cadastro interno e/ou GET /api/contacts)
  → normalizar: só dígitos, DDI 55 + DDD + número
        │
        ▼
GET /api/connections  (status == CONNECTED?)
        │
        ▼
Gerar PDF / URL HTTPS
        │
        ▼
POST /api/send/document/{numero}  (connectionFrom=1, SEM nocreate)
  opcional: POST /api/send/{numero} texto (também SEM nocreate)
  → 1 POST por intenção
        │
        ▼
GET /api/messages/{message.id}  → 200 obrigatório
  gravar message.id + ticketId no sistema interno
```

Checklist:

1. Segredo só no servidor (nunca no front).
2. Host sempre `api-exatas`.
3. Abortar se conexão offline.
4. Casar cliente ↔ `contact.number` / `contact.id`.
5. Tratar `401` / `400` / conexão desconectada.
6. **Não usar `nocreate`** quando a mensagem precisa aparecer no Zappy.
7. Após envio, `GET /api/messages/{id}` = 200 (senão falha de auditoria).
8. Não depender de templates oficiais enquanto a conexão for `whatsmeow`.
9. Não usar `count` de contatos como verdade absoluta.

---

## 7. Referência rápida

| Ação | Método | Path |
|---|---|---|
| Health / conexão | GET | `/api/connections` |
| Contatos | GET | `/api/contacts?page=&pageSize=` |
| Contato | GET | `/api/contacts/{id}` |
| Tickets do número | GET | `/api/tickets/search-by-contact?contactNumber=` |
| Mensagens do contato | GET | `/api/messages?contactId=` |
| Enviar texto | POST | `/api/send/{numero}` (sem `nocreate`) |
| Enviar documento | POST | `/api/send/document/{numero}` |
| Confirmar persistência | GET | `/api/messages/{id}` |
| URL assinada de arquivo | GET | `/api/storage/signed-url/{filekey}` |
| Dashboard agrupado | GET | `/api/dashboard/tickets-agrupados?startDate=&endDate=&dimensao=setor` |

---

## 8. Artefatos locais

| Arquivo | Uso |
|---|---|
| `.env` | Chave (`zappy_api_key`) — **não commit** |
| `contacts.csv` / `contacts.json` | Export de contatos — **não commit** (PII) |
| `probe_api.py` | Script de probe (GET por padrão; `PROBE_MODE=sends` sob demanda) |
| `api_probe_results.json` | Resultado do último probe — **não commit** |

Swagger da instância: [api-exatas … /api-docs/](https://api-exatas.zapcontabil.chat/api-docs/)
