# Gates de controle — Apuração de ICMS

Três gates obrigatórios impedem avanço com documentos faltantes, divergências fiscais ou guia inconsistente.

## Gate 1 — Integridade documental

**Quando:** após a conferência de integridade (XML SEFAZ × sistema fiscal × documentos do cliente).

**Pergunta:** Existem documentos faltantes?

| Resposta | Ação |
| --- | --- |
| SIM | Abrir pendência documental e **bloquear** o fechamento |
| NÃO | Seguir para classificação das operações |

### Validações esperadas (resultado zero ou tratado)

| Validação | Resultado esperado |
| --- | --- |
| NF emitida pela empresa e não escriturada | Zero |
| NF recebida e não escriturada | Zero ou justificada |
| NF cancelada escriturada como normal | Zero |
| Documento duplicado | Zero |
| Chave inválida | Zero |
| Documento de outra competência | Identificado |
| Documento sem classificação | Zero |
| Documento sem item/NCM | Zero |
| Documento com divergência fiscal | Tratado |

**Status relacionados:** `03 Conferência documental` / `04 Pendência documental`.

---

## Gate 2 — Revisão da apuração

**Quando:** após conciliação e antes da transmissão da EFD.

**Papéis:**
- Analista → executa
- Revisor/Coordenador → valida

O revisor valida a cadeia completa:

**documentos → classificação → tributação → créditos → débitos → ajustes → apuração → obrigação.**

**Pergunta:** Existe divergência?

| Resposta | Ação |
| --- | --- |
| SIM | Voltar para a etapa responsável (não liberar transmissão) |
| NÃO | Liberar geração/transmissão da EFD |

**Status relacionados:** `12 Revisão da apuração` / `13 Apuração aprovada` / `11 Pendência fiscal`.

---

## Gate 3 — Guia × obrigação

**Quando:** após apuração = EFD = obrigação estadual, na geração das guias.

**Pergunta:** Valor da guia = valor da obrigação?

| Resposta | Ação |
| --- | --- |
| NÃO | **Não enviar** a guia; corrigir e regenerar |
| SIM | Seguir para aprovação final |

### Checklist mínimo da aprovação da guia

- Competência
- CNPJ/IE
- UF
- Código de receita
- Vencimento
- Valor principal
- Multa/juros (se houver)
- Tipo de ICMS (próprio, ST, DIFAL, FCP, antecipação etc.)

**Status relacionados:** `16 Guias geradas` / `17 Aguardando pagamento`.

---

## Regras para a Skill / agente

1. Em cada gate, faça as perguntas objetivas e registre a evidência (FORM).
2. Não avance o status da competência se houver bloqueio.
3. Pendência documental ou fiscal deve ficar explícita com responsável e próximo passo.
4. A Skill **não calcula** imposto; apenas aplica os gates e aponta a etapa correta.
