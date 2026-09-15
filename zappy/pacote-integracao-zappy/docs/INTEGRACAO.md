# Integração Zappy / ZapContábil (Exatas) — envio de documentos

Guia operacional validado em **2026-09-08**.  
Swagger: https://api-exatas.zapcontabil.chat/api-docs/

Uso: ferramenta interna que envia PDF/texto aos clientes via WhatsApp.

---

## 1. Objetivo

1. Autenticar na API da instância **Exatas**.
2. Resolver o telefone do cliente (cadastro interno e/ou contatos Zappy).
3. Enviar documento (e opcionalmente texto) pela conexão **Operação**.
4. Confirmar que a mensagem **existe no Zappy** (`GET /api/messages/{id}`).

Webhooks do painel recebem eventos. O envio é sempre **REST** (a ferramenta chama a API).

---

## 2. Host e autenticação

| Item | Valor |
|---|---|
| Base URL | `https://api-exatas.zapcontabil.chat` |
| Header | `Authorization: Bearer <chave>` (`Bearer` com B maiúsculo) |
| Accept | `application/json` |
| Chave | Configurações → Integração → Chaves de API |

**Proibido:** `https://api-zapcontabil.zapcontabil.chat` — mesma chave → `401 ERR_INVALID_API_KEY`.

| Situação | Erro |
|---|---|
| Sem header | `ERR_NO_AUTH_HEADER_PRESENT` |
| Esquema ≠ `Bearer` | `ERR_INVALID_AUTH_SCHEME` |
| Chave/host errados | `ERR_INVALID_API_KEY` |

```env
ZAPPY_BASE_URL=https://api-exatas.zapcontabil.chat
ZAPPY_API_KEY=<chave>
ZAPPY_CONNECTION_ID=1
```

---

## 3. Conexão WhatsApp

`GET /api/connections` → 200

| Campo | Valor |
|---|---|
| `id` | `1` |
| `name` | Operação |
| `status` | `CONNECTED` (no momento da validação) |
| `type` | `whatsapp` |
| `connectionSubType` | `whatsmeow` (não é API Oficial Meta) |
| `number` | `557931420075` |

- Sempre enviar `connectionFrom: 1` (salvo mudança de conexão).
- Templates oficiais (`/api/connections/1/templates`, `/api/send-template`) **não se aplicam** → 404 / irrelevantes.
- Health: se `status != CONNECTED`, abortar.

---

## 4. Contatos e tickets (leitura)

### Contatos

```http
GET /api/contacts?page=1&pageSize=1000
GET /api/contacts/{id}
```

- Campos: `id`, `name`, `number`, `email`, `isGroup`, `blocked`, `tags`, …
- O `count` da API **não** reflete o total listável (ex.: `count` ~20k, páginas ~3,2k). Paginar até página vazia.
- `pageSize=1000` funciona nesta instância.
- Número no envio: só dígitos, internacional (ex. `5579998242555`).

### Tickets / mensagens

```http
GET /api/tickets/search-by-contact?contactNumber={numero}&page=1&pageSize=20
GET /api/tickets/{id}
GET /api/tickets/{id}/info
GET /api/messages?ticketId={id}&page=1&pageSize=20
GET /api/messages?contactId={id}&page=1&pageSize=20
GET /api/messages/{id}
```

`ack`: 0 não entregue · 1 enviada · 2 no dispositivo · 3 lida.

### Outros GETs úteis

| Path | Notas |
|---|---|
| `/api/queues`, `/api/users`, `/api/tags` | Listagens paginadas |
| `/api/dashboard/tickets-agrupados` | Query **`dimensao`**: `tag` \| `setor` \| `mes` \| `dia` |
| `/api/storage/signed-url/{filekey}` | URL assinada de mídia |
| `/api/webhooks` | Nesta chave: fallback `{status,version}` — gestão pelo painel |

---

## 5. Persistência no Zappy (crítico)

O painel só mostra o que está **gravado** no ticket.

| Envio | WhatsApp | Zappy |
|---|---|---|
| Texto com `ticketStrategy: "nocreate"` | Sim | **Não** — `GET /api/messages/{id}` → **404** |
| Documento | Sim | Sim |
| Texto **sem** `ticketStrategy` (padrão `create`) | Sim | Sim |

**Nunca use `nocreate`** se a mensagem precisa aparecer na interface.

Após cada POST:

```
response.message.id / ticketId
GET /api/messages/{id}  → 200 obrigatório
404 → falha de auditoria (não marcar como visível no Zappy)
```

Resposta de envio vem encapsulada:

```json
{
  "message": {
    "id": "...",
    "body": "...",
    "contactId": 1229,
    "ticketId": 66740
  }
}
```

---

## 6. Enviar texto

```http
POST /api/send/{numero}
Authorization: Bearer {ZAPPY_API_KEY}
Content-Type: application/json

{
  "body": "Segue o documento solicitado.",
  "connectionFrom": 1
}
```

Não incluir `ticketStrategy: "nocreate"`.  
Opcional: `"ticketStrategy": "reuseOrClose"` para reaproveitar ticket aberto.

---

## 7. Enviar documento (PDF)

### Multipart (arquivo local)

```http
POST /api/send/document/{numero}
Authorization: Bearer {ZAPPY_API_KEY}
Content-Type: multipart/form-data

media=<arquivo.pdf>
connectionFrom=1
```

### JSON (URL HTTPS pública)

```http
POST /api/send/document/{numero}
Content-Type: application/json

{
  "url": "https://seu-sistema/arquivos/guia.pdf",
  "connectionFrom": 1
}
```

`caption` no schema é para **imagem**, não para documento — não use como “mensagem de contexto”.

Outros tipos: `/api/send/{type}/{to}` com `type` ∈ `image` \| `video` \| `audio` \| `voice` \| `document`.

---

## 8. Texto + documento

**Não existe** um único endpoint “mensagem com PDF”.

Faça **dois** POSTs (nessa ordem), ambos **sem** `nocreate`, e valide persistência de **cada** `message.id`:

1. `POST /api/send/{numero}` — texto  
2. `POST /api/send/document/{numero}` — PDF  

No WhatsApp e no Zappy: **2 mensagens**.

---

## 9. `ticketStrategy`

| Valor | Quando usar |
|---|---|
| omitir / `create` | Padrão — mensagem aparece no Zappy |
| `reuseOrClose` | Reaproveitar ticket aberto |
| `nocreate` | **Proibido** se precisar de histórico na UI |
| `close` | Só se a regra de negócio for criar e fechar |

---

## 10. Fluxo da ferramenta interna

```
Cliente interno (CNPJ / código)
        │
        ▼
Telefone (cadastro e/ou GET /api/contacts) → só dígitos + DDI 55
        │
        ▼
GET /api/connections → status CONNECTED?
        │
        ▼
[opcional] POST /api/send/{numero}  texto
        │
        ▼
POST /api/send/document/{numero}  PDF
        │
        ▼
GET /api/messages/{id}  (cada envio) → 200
        │
        ▼
Gravar message.id + ticketId no sistema interno
```

---

## 11. Referência rápida

| Ação | Método | Path |
|---|---|---|
| Health | GET | `/api/connections` |
| Contatos | GET | `/api/contacts?page=&pageSize=` |
| Contato | GET | `/api/contacts/{id}` |
| Tickets do número | GET | `/api/tickets/search-by-contact?contactNumber=` |
| Enviar texto | POST | `/api/send/{numero}` |
| Enviar documento | POST | `/api/send/document/{numero}` |
| Confirmar persistência | GET | `/api/messages/{id}` |

---

## 12. O que evitar

- Host errado (`api-zapcontabil`)
- `nocreate` em envios que precisam aparecer no painel
- Templates Meta nesta conexão `whatsmeow`
- Writes destrutivos (PUT/DELETE em massa) “só para testar”
- Confiar no `count` de contatos
- Disparar vários POSTs por um único documento
