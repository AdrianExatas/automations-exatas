# Testes / validação fictícia — Apuração ICMS

Valida o pacote documental e a skill com um caso fictício (não usa dados reais de cliente).

## Caso

| Campo | Valor |
| --- | --- |
| Empresa | Comercial Exemplo SE Ltda |
| CNPJ | `11222333000181` |
| UF | SE |
| Competência | `2026-07` |
| Cenários | CONFORME e BLOQUEIO Gate 1 |

## Fixtures

- `fixtures/empresa-exemplo.json`
- `fixtures/competencia-2026-07.json`
- `fixtures/form-respostas-conforme.json`
- `fixtures/form-respostas-bloqueio-gate1.json`

## Como rodar

Na raiz do monorepo `automations-exatas/`:

```powershell
python "apuracao-ICMS/tests/scripts/validate_fechamento_ficticio.py"
```

Ou a partir de `apuracao-ICMS/`:

```powershell
python "tests/scripts/validate_fechamento_ficticio.py"
```

Exit code `0` = todos os checks PASS.

## O que é validado

1. Qualidade semântica do `content-v2.json`
2. Estrutura ZIP/XML dos PR/IN/FORM/MP
3. Scaffold do dossiê (15 pastas) + placeholders de evidência
4. Simulação FORM cenário CONFORME
5. Simulação FORM bloqueio Gate 1 (não avança para classificação)
6. Conciliação (13 cruzamentos)
7. Gate 3 (guia = obrigação)
8. Presença da skill e referências (inclui apontamento ao `motor-fiscal/`)
9. Integração com `motor-fiscal`: `importar` + `auditar` nas fixtures do motor (CNPJ `12345678000199` / `2026-06`) gerando JSON/XLSX na pasta `09` do dossiê

## Saídas (locais, não versionadas)

```
_local/validacao/relatorio-validacao-ficticia.md
_local/validacao/resultado.json
_local/dossies/11222333000181/2026-07/
```
