# Matriz tributária — Apuração de ICMS

A parametrização tributária sustenta todo o fechamento. Deve existir uma **matriz tributária das operações** por empresa/estabelecimento.

## Verificações de parametrização

| Verificação | O que precisa estar parametrizado |
| --- | --- |
| Empresa | CNPJ, IE, UF, estabelecimentos |
| Regime | Regime normal, Simples Nacional etc. |
| Produto | NCM, CEST, origem da mercadoria |
| Operação | CFOP de entrada e saída |
| ICMS | CST/CSOSN |
| Tributação | Alíquota interna e interestadual |
| Base de cálculo | Integral ou reduzida |
| Benefício | Isenção, redução, diferimento, crédito presumido etc. |
| ICMS-ST | MVA, pauta, base, alíquota e CEST |
| FCP (E310) | Alíquota e operações sujeitas — **não confundir com FECOEP/AL** |
| FECOEP (AL) | Adicional Lei 6.558/2004 (1%/2%); DAR `50059` / `50075` — ver abaixo |
| DIFAL | Regras por UF/operação |
| Crédito | Permitido, vedado ou proporcional |
| CIAP | Bens sujeitos à apropriação |
| Obrigações | EFD e declarações específicas da UF |

## Exemplo de matriz de operações

| Operação | CFOP | CST | Crédito/Débito | ST | DIFAL | FCP | Benefício |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| Compra para revenda interna | 1.xxx | 00 | Crédito | Não | Não | Conforme operação | Não |
| Venda interna | 5.xxx | 00 | Débito | Conforme produto | Não | Conforme produto | Conforme legislação |
| Compra interestadual | 2.xxx | Conforme | Crédito | Avaliar | Avaliar | Avaliar | Avaliar |
| Venda interestadual | 6.xxx | Conforme | Débito | Avaliar | Avaliar | Avaliar | Avaliar |

## Naturezas econômicas a classificar

Compra para revenda; matéria-prima; uso e consumo; ativo imobilizado; frete; devolução; bonificação; remessa; retorno; industrialização; transferência; importação; venda; venda com ST; venda com benefício; operação sem incidência; diferida; com redução de base.

A natureza determina principalmente o **direito ao crédito** e a **forma de débito** do ICMS.

## Quatro grandes apurações (+ FECOEP AL)

| Apuração | Controle | EFD (referência) |
| --- | --- | --- |
| ICMS próprio | Conta gráfica normal | E110 (+ ajustes do Bloco E) |
| ICMS-ST | Apuração separada por UF | E200/E210 |
| DIFAL/FCP | Por UF origem/destino | E300/E310 |
| FECOEP (Alagoas) | Débitos/créditos E111 + DAR próprio | E111 (`AL009999`/`AL029999` FECOEP, `AL040001`/`AL050001`) + E116 `50059`/`50075` — **não** E310 |
| ICMS especial | Antecipação, importação e situações específicas | Conforme UF |

### FECOEP AL ≠ FCP E310

Em Alagoas o FECOEP (Lei 6.558/2004 / IN SEF 6/2017) é adicional estadual recolhido em DAR:

| Tributo | E116 `COD_OR` | `COD_REC` | Motor |
| --- | --- | --- | --- |
| ICMS Normal | `000` | `13170` | `VL_ICMS_RECOLHER` (E110) |
| FECOEP Normal | `006` | `50059` | `vl_fecoep_recolher` |
| ICMS DIFAL | `090` | `15610` | E116 / guia |
| FECOEP DIFAL | `090` | `50075` | `vl_fecoep_difal_recolher` |

Config: `motor-fiscal/config/icms_al.json` → bloco `fecoep`. Bonsono 05/06 tipicamente **não** tem E300/E310; o cruzamento 10 (FCP E310) fica zerado/N/A — o Gate 3 fecha pelas quatro receitas acima.

## Conta gráfica do ICMS próprio (conceitual)

```
Saldo credor anterior
+ Créditos do período
+ Outros créditos
+ Estornos de débitos
− Débitos do período
− Outros débitos
− Estornos de créditos
= Saldo preliminar
− Deduções/incentivos permitidos
= ICMS a recolher  OU  Saldo credor a transportar
```

## Ajuste — campos obrigatórios

Cada ajuste deve conter: **código + fundamento legal + valor + documento comprobatório + responsável**.

## Observação 2026 (Reforma Tributária)

Documentos que tragam **exclusivamente IBS/CBS** e não tratem de ICMS/IPI **não** devem ser escriturados na EFD ICMS/IPI. Quando o documento envolver os novos tributos e também ICMS/IPI, a parte de ICMS/IPI continua sendo escriturada normalmente.
