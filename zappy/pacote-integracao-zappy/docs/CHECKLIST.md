# Checklist de aceite — integração Zappy (envio de documentos)

A implementação só está pronta quando todos os itens abaixo forem verdadeiros.

## Configuração

- [ ] Usa **somente** `ZAPPY_BASE_URL=https://api-exatas.zapcontabil.chat`
- [ ] Não referencia `api-zapcontabil.zapcontabil.chat` em código de produção
- [ ] `ZAPPY_API_KEY` só no servidor / secrets (nunca no front)
- [ ] Header `Authorization: Bearer <chave>` com **B** maiúsculo
- [ ] `ZAPPY_CONNECTION_ID` (ou `connectionFrom`) = `1` salvo mudança explícita de conexão

## Health check

- [ ] Antes de enviar, `GET /api/connections` e aborta se a conexão alvo não estiver `CONNECTED`

## Envio

- [ ] Documento: `POST /api/send/document/{numero}` (multipart `media` ou JSON `url`)
- [ ] Texto (se houver): `POST /api/send/{numero}` em request **separado**
- [ ] Número no path: só dígitos, formato internacional (ex.: `5579…`), sem `+`
- [ ] **Não** envia `ticketStrategy: "nocreate"` quando a mensagem precisa aparecer no Zappy
- [ ] Não assume que `caption` no documento é texto de contexto para o cliente

## Persistência / auditoria

- [ ] Lê `response.message.id` e `response.message.ticketId` do JSON encapsulado `{ "message": { ... } }`
- [ ] Após cada envio bem-sucedido HTTP 200, faz `GET /api/messages/{id}`
- [ ] Se o GET retornar 404, trata como **falha de auditoria** (não marca como “visível no Zappy”)
- [ ] Persiste no sistema interno: `message.id`, `ticketId`, número, timestamp, status do GET

## Contatos

- [ ] Não confia no campo `count` de `/api/contacts` como total real (paginar até página vazia)
- [ ] Filtra `isGroup: false` quando o destino é pessoa

## Fora de escopo (não implementar sem necessidade)

- [ ] Não usa templates oficiais Meta (`/api/send-template`) nesta conexão `whatsmeow`
- [ ] Não faz PUT/DELETE em massa em contatos/tags/filas/webhooks “só para testar”
- [ ] Não dispara `probe` / envios em loop em produção

## Teste manual (com número autorizado pelo time)

- [ ] 1 PDF aparece no WhatsApp **e** no ticket do Zappy
- [ ] Se enviar texto + PDF: **2** bolhas no WhatsApp e **2** mensagens no ticket
- [ ] Cada `message.id` resolve em `GET /api/messages/{id}` com 200
