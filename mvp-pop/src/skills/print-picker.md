# Seletor de prints

Com base na transcrição, nas seções da IT e nos timestamps candidatos de mudança de tela, escolha um frame por etapa visual.

## Resposta

Somente JSON:

```json
{
  "prints": [
    {
      "etapa_id": "E01",
      "timestamp_seconds": 12.5,
      "rotulo": "Tela inicial",
      "needs_pii_review": true
    }
  ]
}
```

## Regras

- Prefira o momento **depois** da ação descrita.
- Evite timestamps duplicados próximos (< 1s).
- Marque `needs_pii_review=true` se a tela puder exibir CPF, senha ou dados de cliente.
- Só inclua etapas com `campo_print.incluir=true` ou claramente visuais.
