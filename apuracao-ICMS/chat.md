Sim. Para um processo fiscal bem controlado, eu faria o **mapeamento da apuração de ICMS como um fluxo de fechamento mensal**, e não apenas como “importar notas → apurar → gerar guia”. A EFD ICMS/IPI deve reunir os documentos fiscais, registros de apuração e demais informações exigidas para cada estabelecimento, então o processo precisa começar antes da escrituração e terminar somente depois da transmissão, pagamento e arquivamento das evidências. ([Serviços e Informações do Brasil][1])

## Mapa macro do processo

**PARAMETRIZAÇÃO TRIBUTÁRIA**
→ **RECEBIMENTO DOS DOCUMENTOS**
→ **CONFERÊNCIA DE INTEGRIDADE**
→ **CLASSIFICAÇÃO DAS OPERAÇÕES**
→ **ESCRITURAÇÃO FISCAL**
→ **CONFERÊNCIA DAS ENTRADAS**
→ **CONFERÊNCIA DAS SAÍDAS**
→ **APURAÇÕES ESPECIAIS**
→ **APURAÇÃO DO ICMS PRÓPRIO**
→ **AJUSTES / BENEFÍCIOS / ESTORNOS**
→ **CONCILIAÇÃO**
→ **REVISÃO**
→ **GERAÇÃO DA EFD**
→ **VALIDAÇÃO NO PVA**
→ **OBRIGAÇÕES ESTADUAIS**
→ **GERAÇÃO DAS GUIAS**
→ **APROVAÇÃO**
→ **PAGAMENTO**
→ **CONFERÊNCIA DO PAGAMENTO**
→ **FECHAMENTO DA COMPETÊNCIA**
→ **ARQUIVAMENTO / AUDITORIA**

---

# 1. Parametrização tributária

Esta é a etapa que sustenta todo o restante.

| Verificação     | O que precisa estar parametrizado                     |
| --------------- | ----------------------------------------------------- |
| Empresa         | CNPJ, IE, UF, estabelecimentos                        |
| Regime          | Regime normal, Simples Nacional etc.                  |
| Produto         | NCM, CEST, origem da mercadoria                       |
| Operação        | CFOP de entrada e saída                               |
| ICMS            | CST/CSOSN                                             |
| Tributação      | Alíquota interna e interestadual                      |
| Base de cálculo | Integral ou reduzida                                  |
| Benefício       | Isenção, redução, diferimento, crédito presumido etc. |
| ICMS-ST         | MVA, pauta, base, alíquota e CEST                     |
| FCP             | Alíquota e operações sujeitas                         |
| DIFAL           | Regras por UF/operação                                |
| Crédito         | Permitido, vedado ou proporcional                     |
| CIAP            | Bens sujeitos à apropriação                           |
| Obrigações      | EFD e declarações específicas da UF                   |

### Controle principal

Deve existir uma **matriz tributária das operações**.

Exemplo:

| Operação                    |  CFOP |      CST | Crédito/Débito | ST               | DIFAL   | FCP               | Benefício           |
| --------------------------- | ----: | -------: | -------------- | ---------------- | ------- | ----------------- | ------------------- |
| Compra para revenda interna | 1.xxx |       00 | Crédito        | Não              | Não     | Conforme operação | Não                 |
| Venda interna               | 5.xxx |       00 | Débito         | Conforme produto | Não     | Conforme produto  | Conforme legislação |
| Compra interestadual        | 2.xxx | Conforme | Crédito        | Avaliar          | Avaliar | Avaliar           | Avaliar             |
| Venda interestadual         | 6.xxx | Conforme | Débito         | Avaliar          | Avaliar | Avaliar           | Avaliar             |

Essa matriz é onde eu colocaria a maior parte das automações e travas.

---

# 2. Recebimento dos documentos fiscais

O fechamento inicia pela captura de **100% dos documentos da competência**.

Devem entrar no processo, conforme a atividade da empresa:

NF-e; NFC-e; CT-e; CT-e OS; NFCom; documentos de importação; documentos relativos a energia/comunicação quando aplicáveis; documentos complementares; devoluções; cancelamentos; eventos fiscais; GNRE/DAE já recolhidos; documentos de ativo imobilizado; transferências; e documentos fiscais emitidos contra a empresa.

### Saída da etapa

**Base documental da competência consolidada.**

---

# 3. Conferência de integridade

Antes de apurar imposto:

**XML SEFAZ × sistema fiscal × documentos informados pelo cliente**

O sistema deve procurar principalmente:

| Validação                                 | Resultado esperado  |
| ----------------------------------------- | ------------------- |
| NF emitida pela empresa e não escriturada | Zero                |
| NF recebida e não escriturada             | Zero ou justificada |
| NF cancelada escriturada como normal      | Zero                |
| Documento duplicado                       | Zero                |
| Chave inválida                            | Zero                |
| Documento de outra competência            | Identificado        |
| Documento sem classificação               | Zero                |
| Documento sem item/NCM                    | Zero                |
| Documento com divergência fiscal          | Tratado             |

### Gate 1

**Existem documentos faltantes?**

**SIM →** abrir pendência e bloquear fechamento.
**NÃO →** seguir para classificação.

---

# 4. Classificação das operações

Aqui não basta olhar somente CFOP.

É necessário identificar a **natureza econômica da entrada ou saída**.

Exemplos:

Compra para revenda
Matéria-prima
Uso e consumo
Ativo imobilizado
Frete
Devolução
Bonificação
Remessa
Retorno
Industrialização
Transferência
Importação
Venda
Venda com ST
Venda com benefício fiscal
Operação sem incidência
Operação diferida
Operação com redução de base

Isso determina principalmente o **direito ao crédito e a forma de débito do ICMS**.

---

# 5. Escrituração

Depois da classificação:

**XML/documento → regras tributárias → escrituração fiscal**

A escrituração precisa refletir corretamente:

CFOP; CST; NCM; CEST; base de ICMS; alíquota; ICMS; ICMS-ST; FCP; DIFAL; valor desonerado; redução de base; benefícios; ajustes e demais informações exigidas pela UF.

Para 2026 existe ainda uma regra importante da transição da Reforma Tributária: documentos que tragam **exclusivamente IBS/CBS e não tratem de ICMS/IPI não devem ser escriturados na EFD ICMS/IPI**; quando o documento envolver os novos tributos e também ICMS/IPI, a parte relativa ao ICMS/IPI continua sendo escriturada normalmente. ([Serviços e Informações do Brasil][2])

---

# 6. Conferência das entradas

Agora inicia a auditoria dos créditos.

### Separação recomendada

| Entrada                 | Tratamento                              |
| ----------------------- | --------------------------------------- |
| Mercadoria para revenda | Avaliar crédito                         |
| Insumo                  | Avaliar crédito                         |
| Ativo imobilizado       | Avaliar CIAP                            |
| Uso/consumo             | Avaliar vedação/permissão               |
| Frete                   | Avaliar vínculo com operação            |
| Energia                 | Avaliar legislação                      |
| Comunicação             | Avaliar legislação                      |
| Compra com ST           | Tratamento específico                   |
| Compra com benefício    | Verificar reflexo no crédito            |
| Devolução               | Recomposição conforme operação original |

O princípio constitucional do ICMS é a não cumulatividade, compensando-se o imposto devido nas operações com aquele cobrado nas operações anteriores, observadas as limitações legais. ([Palácio do Planalto][3])

---

# 7. Controle do CIAP

Se houver ativo imobilizado com direito ao crédito:

**Aquisição do bem**
→ cadastrar no CIAP
→ controlar saldo
→ calcular parcela apropriável
→ aplicar proporcionalidade quando aplicável
→ lançar crédito mensal
→ controlar baixa/alienação.

Na EFD, o controle do crédito do ativo permanente está no **Bloco G**, com destaque para o registro **G110**. ([Serviços e Informações do Brasil][4])

Esse processo deve ficar separado dos créditos comuns.

---

# 8. Conferência das saídas

Depois entram os débitos.

Para cada operação de saída:

**Natureza da operação**
→ CFOP
→ CST
→ base de cálculo
→ redução de base
→ alíquota
→ débito de ICMS
→ benefício fiscal
→ FCP
→ ST
→ DIFAL
→ desoneração.

### Cruzamento fundamental

**Faturamento fiscal × documentos emitidos × escrituração × contabilidade**

Qualquer diferença deve estar explicada antes do fechamento.

---

# 9. Separação das quatro grandes apurações

Aqui considero fundamental dividir o processo.

| Apuração          | Controle                                        |
| ----------------- | ----------------------------------------------- |
| **ICMS próprio**  | Conta gráfica normal                            |
| **ICMS-ST**       | Apuração separada                               |
| **DIFAL/FCP**     | Por UF quando aplicável                         |
| **ICMS especial** | Antecipação, importação e situações específicas |

Na EFD, essa separação também aparece estruturalmente. A apuração das operações próprias utiliza registros como **E110**; ICMS-ST utiliza a estrutura **E200/E210**; e DIFAL/FCP possui a estrutura **E300/E310**. ([Secretaria da Fazenda da Paraíba][5])

---

# 10. Apuração do ICMS próprio

Conceitualmente:

**Saldo credor anterior**

* **Créditos do período**
* **Outros créditos**
* **Estornos de débitos**

menos

**Débitos do período**

* **Outros débitos**
* **Estornos de créditos**

= **Saldo preliminar**

Depois:

**Saldo preliminar**
− **deduções/incentivos permitidos**

= **ICMS a recolher**

ou

= **Saldo credor a transportar**

Na EFD, a apuração do ICMS próprio é consolidada no **Registro E110**, com os ajustes detalhados em registros relacionados do Bloco E. ([Serviços e Informações do Brasil][6])

---

# 11. Ajustes da apuração

Criaria uma etapa específica para ajustes, nunca permitindo lançamento genérico sem documentação.

Exemplos:

Crédito presumido
Outros créditos
Estorno de créditos
Estorno de débitos
Outros débitos
Deduções
Benefícios fiscais
Crédito de CIAP
Ajustes decorrentes de processos fiscais/judiciais
Ressarcimentos
Complementações

Cada ajuste deve conter:

**código + fundamento legal + valor + documento comprobatório + responsável.**

---

# 12. ICMS-ST

Fluxo paralelo:

**Operações sujeitas à ST**
→ separar por UF
→ calcular débitos ST
→ considerar ajustes
→ considerar créditos/ressarcimentos quando permitidos
→ determinar saldo
→ gerar obrigação.

Na estrutura da EFD, o E210 informa a apuração de ICMS-ST por UF. ([Secretaria da Fazenda da Paraíba][5])

---

# 13. DIFAL e FCP

Fluxo:

**Venda/entrada sujeita a DIFAL**
→ identificar UF origem
→ identificar UF destino
→ verificar alíquotas
→ calcular DIFAL
→ verificar FCP
→ separar valores por UF
→ verificar recolhimento por operação ou por apuração
→ gerar obrigação correspondente.

O registro E310 foi criado justamente para informar a apuração de **DIFAL e FCP por UF de origem/destino**. ([Serviços e Informações do Brasil][7])

---

# 14. Antecipações e ICMS especiais

Também devem ser retirados da apuração comum quando a legislação determinar tratamento específico.

Exemplos:

ICMS antecipado
Antecipação parcial
ICMS importação
ICMS-ST entrada
DIFAL aquisição
FCP
Recolhimentos especiais
Regimes especiais.

A regra e o código de receita dependem da **UF do estabelecimento/operação**.

---

# 15. Conciliação da apuração

Essa é uma das etapas mais importantes.

Eu criaria uma folha de conferência com:

| Cruzamento                          | Deve fechar |
| ----------------------------------- | ----------- |
| XML × escrituração                  | 100%        |
| Total entradas × livro fiscal       | 100%        |
| Total saídas × livro fiscal         | 100%        |
| Débitos ICMS notas × apuração       | 100%        |
| Créditos ICMS notas × apuração      | 100%        |
| Ajustes × documentos comprobatórios | 100%        |
| CIAP × crédito lançado              | 100%        |
| ST × apuração ST                    | 100%        |
| DIFAL × apuração DIFAL              | 100%        |
| FCP × apuração FCP                  | 100%        |
| Saldo anterior × mês anterior       | 100%        |
| Apuração × EFD                      | 100%        |
| EFD × guia                          | 100%        |

---

# 16. Gate de revisão

O processo deve ter obrigatoriamente dois níveis:

**Analista → executa**
**Revisor/Coordenador → valida**

O responsável pela revisão não deve simplesmente verificar se “o imposto bateu”.

Ele deve validar:

**documentos → classificação → tributação → créditos → débitos → ajustes → apuração → obrigação.**

### Gate 2

**Existe divergência?**

SIM → volta para a etapa responsável.

NÃO → libera transmissão.

---

# 17. Geração da EFD ICMS/IPI

Depois de aprovada a apuração:

**Sistema fiscal**
→ gerar arquivo EFD
→ importar no PVA
→ validar estrutura
→ corrigir erros
→ analisar advertências
→ validar novamente.

A EFD contém justamente documentos fiscais, registros de apuração e outras informações econômico-fiscais do estabelecimento. ([Serviços e Informações do Brasil][1])

---

# 18. Conferência do Bloco E

Eu colocaria uma conferência obrigatória do Bloco E antes da transmissão.

Principalmente:

| Registro  | Conferência                           |
| --------- | ------------------------------------- |
| E100      | Período da apuração                   |
| E110      | ICMS próprio                          |
| E111      | Ajustes                               |
| E112/E113 | Detalhes dos ajustes quando aplicável |
| E115      | Informações adicionais da apuração    |
| E116      | Obrigações a recolher                 |
| E200/E210 | ICMS-ST                               |
| E300/E310 | DIFAL/FCP                             |

O registro E116 discrimina os pagamentos efetuados ou a efetuar relativos à apuração do ICMS próprio. ([Serviços e Informações do Brasil][6])

---

# 19. Obrigações estaduais adicionais

Depois da EFD deve existir uma decisão:

**A UF possui outra obrigação vinculada ao ICMS?**

Dependendo do Estado, podem existir declarações, demonstrativos ou sistemas complementares.

Então o cadastro da empresa deve possuir:

**UF → obrigação → periodicidade → vencimento → responsável.**

Isso precisa ser parametrizado individualmente.

---

# 20. Geração das guias

Depois que:

**Apuração = EFD = obrigação estadual**

somente então gerar:

DAE/DAR estadual
GNRE
Guia de ICMS-ST
Guia DIFAL
FCP
Antecipação
ou demais recolhimentos.

### Gate 3

**Valor da guia = valor da obrigação?**

Se não, guia não deve ser enviada.

---

# 21. Aprovação final

Antes de liberar a guia ao cliente ou financeiro:

**Competência**
**CNPJ/IE**
**UF**
**Código de receita**
**Vencimento**
**Valor principal**
**Multa/juros, se houver**
**Tipo de ICMS**

devem ser conferidos.

---

# 22. Pagamento

Depois do envio:

**Guia enviada**
→ acompanhar vencimento
→ receber comprovante
→ confirmar pagamento.

Não recomendo considerar o processo encerrado simplesmente porque a guia foi gerada.

---

# 23. Fechamento definitivo

O fechamento somente ocorre quando houver:

**EFD transmitida + recibo + obrigações transmitidas + guias geradas + pagamento acompanhado + documentação arquivada.**

A competência passa então para:

**FECHADA**

e alterações posteriores devem exigir **reabertura controlada**.

---

# 24. Retificação

Se surgir documento após o fechamento:

**Documento novo/divergência**
→ avaliar impacto
→ reabrir competência
→ reescriturar
→ recalcular
→ comparar apuração anterior × nova
→ calcular diferença
→ avaliar juros/multa
→ retificar EFD/obrigação
→ gerar guia complementar ou controlar crédito
→ documentar motivo da retificação.

---

# 25. Dossiê mensal de ICMS

Eu criaria automaticamente uma pasta por competência contendo:

**01 – Documentos fiscais**
**02 – Relatórios de entradas**
**03 – Relatórios de saídas**
**04 – Apuração ICMS próprio**
**05 – ICMS-ST**
**06 – DIFAL/FCP**
**07 – CIAP**
**08 – Ajustes e benefícios**
**09 – Relatório de conferência**
**10 – EFD transmitida**
**11 – Recibo**
**12 – Obrigações estaduais**
**13 – Guias**
**14 – Comprovantes**
**15 – Evidências de revisão**

---

# Status que eu utilizaria no workflow

| Etapa | Status                  |
| ----- | ----------------------- |
| 01    | Aguardando documentação |
| 02    | Documentação recebida   |
| 03    | Conferência documental  |
| 04    | Pendência documental    |
| 05    | Escrituração            |
| 06    | Conferência de entradas |
| 07    | Conferência de saídas   |
| 08    | Análise tributária      |
| 09    | Apurações especiais     |
| 10    | Apuração preliminar     |
| 11    | Pendência fiscal        |
| 12    | Revisão da apuração     |
| 13    | Apuração aprovada       |
| 14    | Validação EFD           |
| 15    | EFD transmitida         |
| 16    | Guias geradas           |
| 17    | Aguardando pagamento    |
| 18    | Pagamento confirmado    |
| 19    | Fechamento concluído    |

## Fluxo final resumido

**Documentos**
↓
**Integridade**
↓
**Classificação tributária**
↓
**Escrituração**
↓
**Entradas / Créditos**
↓
**Saídas / Débitos**
↓
**CIAP + ST + DIFAL + FCP + Antecipações**
↓
**Ajustes**
↓
**ICMS próprio**
↓
**Conciliação**
↓
**Revisão**
↓
**EFD**
↓
**Obrigações estaduais**
↓
**Guias**
↓
**Pagamento**
↓
**Fechamento**
↓
**Auditoria / arquivo**

Esse desenho já serve como **fluxo-mestre**. O próximo nível que eu recomendo é transformar cada uma dessas etapas em um **POP operacional**, definindo para cada atividade: **entrada, responsável, sistema utilizado, procedimento, regra de validação, evidência obrigatória, prazo, saída e condição para avançar**. Isso permite posteriormente automatizar grande parte da apuração e impedir que uma competência avance com documentos faltantes ou divergências fiscais.

[1]: https://www.gov.br/pt-br/servicos/entregar-escrituracao-fiscal-digital-efd-icms-ipi?utm_source=chatgpt.com "Entregar Escrituração Fiscal Digital"
[2]: https://www.gov.br/sped/pt-br/assuntos/comunicados/nova-versao-do-guia-pratico-da-efd-icms-ipi?utm_source=chatgpt.com "Nova versão do Guia Prático da EFD ICMS IPI"
[3]: https://www.planalto.gov.br/ccivil_03/Constituicao/DOUconstituicao88.pdf?utm_source=chatgpt.com "Diário Oficial"
[4]: https://www.gov.br/sped/pt-br/assuntos/escrituracoes-digitais/efd-icms-ipi/manuais-e-documentos-tecnicos/guia-pratico-da-efd-icms-ipi-3-2.2/%40%40display-file/file?utm_source=chatgpt.com "GUIA PRÁTICO DA ESCRITURAÇÃO FISCAL DIGITAL - EFD"
[5]: https://www.sefaz.pb.gov.br/info/declaracoes/sped-fiscal?utm_source=chatgpt.com "SPED - EFD-ICMS/IPI - SER/PB"
[6]: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/sped/manuais-efd-icms-ipi/historico-guias-pratico/guia-pratico-efd-icms-ipi-versao-3-0-1.pdf?utm_source=chatgpt.com "GUIA PRÁTICO DA ESCRITURAÇÃO FISCAL DIGITAL - EFD"
[7]: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/sped/manuais-efd-icms-ipi/historico-guias-pratico/guia-pratico-da-efd-versao-3-0-3.pdf?utm_source=chatgpt.com "GUIA PRÁTICO DA ESCRITURAÇÃO FISCAL DIGITAL - EFD"
