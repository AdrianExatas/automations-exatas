# Pacote de integração Zappy (Exatas)

Pacote **autocontido** para a pessoa/IA que vai implementar a ferramenta interna de envio de documentos via WhatsApp (ZapContábil / Júpiter).

Validado em **2026-09-08** contra `https://api-exatas.zapcontabil.chat`.  
Swagger: https://api-exatas.zapcontabil.chat/api-docs/

## Conteúdo

```
pacote-integracao-zappy/
  README.md
  .env.example
  docs/
    INTEGRACAO.md      # regras operacionais (leia isto)
    CHECKLIST.md       # critérios de aceite da implementação
  examples/
    send_document.py
    send_text_then_document.py
  skills/
    zappy-send-documents/
      SKILL.md         # Cursor Skill — copie para o projeto
```

**Não inclui** chave de API, export de contatos nem dumps com PII. A chave deve ser enviada **à parte**.

## Como a IA / desenvolvedor deve começar

1. Ler [`skills/zappy-send-documents/SKILL.md`](skills/zappy-send-documents/SKILL.md) (regras curtas e obrigatórias).
2. Ler [`docs/INTEGRACAO.md`](docs/INTEGRACAO.md) (detalhes e catálogo).
3. Copiar a skill para o projeto:
   ```text
   .cursor/skills/zappy-send-documents/SKILL.md
   ```
4. Copiar `.env.example` → `.env` e preencher `ZAPPY_API_KEY` (fornecida fora deste pacote).
5. Implementar o cliente da ferramenta seguindo [`docs/CHECKLIST.md`](docs/CHECKLIST.md).
6. Usar os scripts em `examples/` como referência (stdlib Python). Só dispare envios reais com número **autorizado** pelo time.

## Regras que não podem ser ignoradas

| Regra | Motivo |
|---|---|
| Base URL = `https://api-exatas.zapcontabil.chat` | Host genérico `api-zapcontabil` rejeita a chave (`ERR_INVALID_API_KEY`) |
| `Authorization: Bearer <chave>` (B maiúsculo) | Outros esquemas falham |
| `connectionFrom: 1` | Conexão Operação (`whatsmeow`) |
| **Nunca** `ticketStrategy: nocreate` se a mensagem precisa aparecer no Zappy | Texto chega no WhatsApp e **não** persiste no ticket (`GET /api/messages/{id}` → 404) |
| Após cada POST: `GET /api/messages/{id}` = 200 | Única certeza de que a UI do Zappy vai mostrar o envio |
| Texto + PDF = **2 POSTs** | Não existe “mensagem + documento” num único request; `caption` não serve para PDF |
| 1 intenção = 1 POST | Evita spam no WhatsApp do cliente |

## Variáveis de ambiente

Ver [`.env.example`](.env.example).
