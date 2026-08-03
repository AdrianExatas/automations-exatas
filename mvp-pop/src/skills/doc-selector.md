# Seletor de documentos

Decida quais documentos gerar.

## Resposta

Somente JSON:

```json
{
  "documentos_solicitados": ["it", "form"],
  "motivo": "Atividade operacional pontual"
}
```

## Heurística

- Atividade simples / tela única → `["it","form"]`
- Processo amplo com várias áreas → `["pop","it","form"]`
- Inclua `mp` só se houver riscos/controles evidentes na fala
- Respeite override do usuário quando informado
