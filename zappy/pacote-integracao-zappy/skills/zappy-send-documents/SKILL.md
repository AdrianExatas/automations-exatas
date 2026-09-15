---
name: zappy-send-documents
description: >-
  Integra com a API Zappy/ZapContábil da instância Exatas para enviar documentos
  e texto via WhatsApp (PDF multipart ou URL, health check de conexão, auditoria
  de persistência no ticket). Use when implementing or debugging envio de
  documentos a clientes, integração Zappy, ZapContábil, api-exatas.zapcontabil.chat,
  connectionFrom, Bearer API key, ou quando o usuário mencionar Zappy/WhatsApp
  documentos Exatas.
---

# Zappy — envio de documentos (Exatas)

## Quando aplicar

Implementar ou alterar cliente HTTP que fala com a API Júpiter/Zappy da Exatas para mandar PDF/texto no WhatsApp.

Leia também `docs/INTEGRACAO.md` e `docs/CHECKLIST.md` neste pacote (ou equivalentes no projeto).

## Regras obrigatórias

1. **Base URL:** somente `https://api-exatas.zapcontabil.chat`  
   Nunca `https://api-zapcontabil.zapcontabil.chat` (chave inválida nesse host).

2. **Auth:** header `Authorization: Bearer <ZAPPY_API_KEY>` — palavra `Bearer` com B maiúsculo.

3. **Conexão:** `connectionFrom: 1` (Operação, `whatsmeow`). Antes de enviar: `GET /api/connections` e abortar se `status != CONNECTED`.

4. **Persistência na UI:** **proibido** `ticketStrategy: "nocreate"` se a mensagem precisa aparecer no Zappy.  
   Texto com `nocreate` pode chegar no WhatsApp e **não** existir em `GET /api/messages/{id}` (404).

5. **Após cada POST 200:**  
   - Extrair `id` de `response.message` (payload encapsulado).  
   - `GET /api/messages/{id}` deve retornar **200**.  
   - Se 404 → falha de auditoria; não marcar como “visível no Zappy”.

6. **Texto + documento:** dois POSTs separados (não há endpoint combinado).  
   `caption` no documento **não** é mensagem de contexto (só imagem).

7. **1 intenção = 1 POST** de documento (não repetir envios de teste em loop).

8. **Número:** só dígitos, internacional (ex. `5579…`), path `/api/send/.../{numero}`.

## Fluxo padrão

```
GET /api/connections
  → opcional: POST /api/send/{numero}  { body, connectionFrom: 1 }
  → POST /api/send/document/{numero}  multipart media + connectionFrom
  → GET /api/messages/{id}  (cada envio)
  → gravar message.id + ticketId
```

### Documento multipart

`POST /api/send/document/{numero}`  
Campos: `media` (arquivo), `connectionFrom=1`. Sem `ticketStrategy` (ou `reuseOrClose` se a regra de negócio pedir).

### Documento por URL

JSON: `{ "url": "https://...", "connectionFrom": 1 }`.

### Texto

`POST /api/send/{numero}`  
JSON: `{ "body": "...", "connectionFrom": 1 }`.

## Erros de auth conhecidos

| Erro | Causa |
|---|---|
| `ERR_NO_AUTH_HEADER_PRESENT` | Sem `Authorization` |
| `ERR_INVALID_AUTH_SCHEME` | Não é `Bearer` |
| `ERR_INVALID_API_KEY` | Chave errada ou host errado |

## Não fazer

- Templates oficiais Meta (`/api/send-template`) nesta conexão
- Confiar no `count` de `/api/contacts` como total real
- Colocar API key no frontend
- Usar `nocreate` “para não abrir ticket” se a auditoria na tela importa
