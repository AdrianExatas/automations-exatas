---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d46d7bfa96fe8837a56d1d89b91814f1bb8f56f67f8deaa7302471b5af3b0220"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/pgmei/mensagens/).

# Mensagens de negócio

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Aviso-PGMEI-MSG_13011] | Não é permitida a emissão do DAS. Débito enviado para inscrição em Dívida Ativa. | Em dívida ativa não é possível gerar o DAS. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_13012] | Existe débito enviado para inscrição em dívida ativa: {0}. DAS gerado apenas com os valores que estão em cobrança na RFB. | DAS emitido sem os tributos enviados à PGFN. HTTP STATUS: 200 |
| [Erro-PGMEI-MSG_23001] | Falha no acesso ao sistema PGMEI. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23002] | Falha na recuperação dos tributos. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23003] | Sistema TACO indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Aviso-PGMEI-MSG_23004] | Taxa Selic ainda não cadastrada. Favor informar uma data para pagamento dentro do mês atual. | Informar data válida. HTTP STATUS: 200 |
| [Erro-PGMEI-MSG_23005] | Sistema SIDAT indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23006] | Contribuinte não encontrado no Cadastro CNPJ. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23007] | Base CNPJ indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [EntradaIncorreta-PGMEI-MSG_23008] | Contribuinte não optante pelo SIMEI. | Informar CNPJ optante. HTTP STATUS: 200 |
| [Erro-PGMEI-MSG_23009] | Base SIMPLES/MEI indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23010] | Sistema PGMEI indisponível. Tente novamente mais tarde. | Efetue nova tentativa. HTTP STATUS: 500 |
| [EntradaIncorreta-PGMEI-MSG_23013] | Empresa baixada para o ano escolhido. | Informar outro período. HTTP STATUS: 200 |
| [EntradaIncorreta-PGMEI-MSG_23015] | Sr. Contribuinte antes da geração do(s) documento(s) é necessário realizar a entrega da declaração do ano calendário de {ano}. | Transmitir DASNSIMEI antes de realizar esta operação. HTTP STATUS: 200 |
| [EntradaIncorreta-PGMEI-MSG_23016] | Não há valor cadastrado para o salário mínimo. Tente novamente no próximo dia útil. | A solicitação foi feita para um período que não existe o salário mínimo pré-definido pela RFB. Deve tentar novamente no próximo dia útil. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_23017] | Não foi emitido DAS pois o limite mínimo de R$ 10,00 não foi atingido. | Não é possível gerar o DAS. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_23018] | Já foi efetuado pagamento para este PA. Não será gerado DAS. | A requisição ocorreu com sucesso, no entanto, não é possível gerar o DAS. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_23019] | Não há DAS a ser emitido | A requisição ocorreu com sucesso, no entanto, não é possível gerar o DAS. HTTP STATUS: 200 |
| [Erro-PGMEI-MSG_23020] | Erro na geração do documento de arrecadação. Falha na execução do sistema SENDA na emissão do Documento de Arrecadação. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23021] | Falha na geração do documento de arrecadação. Erro de validação dos dados de entrada via sistema SENDA. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23022] | Falha no acionamento ao sistema SENDA. Falha ao emitir o documento de arrecadação. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23025] | Não foi encontrada nenhuma CNAE anual para esse CNPJ no ano-calendário indicado. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23026] | Base SINAC indisponível. Tente novamente mais tarde. | Efetuar nova tentativa. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23027] | Fallha ao recuperar as descrições dos tributos. Tente novamente mais tarde. | Efetuar nova tentativa. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23028] | Número máximo de Apurações PGMEI para o Ano Calendário excedido. Entre em contato com o canal Fale Conosco - Receita Federal | O limite de emissões de DAS excedeu o permitido. Contate a RFB. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23029] | Sistema TOM indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-25000] | Houve um erro na consulta de dívida ativa. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [EntradaIncorreta-PGMEI-MSG_23030] | Parâmetro de entrada inválido. | Verifique o detalhamento, que pode ser: - Período Apuração Inválido; - Período de Apuração futuro; - Período de Apuração decadente; - Data da Consolidação inválida ou anterior à data atual; Efetuar nova tentativa com os parâmetros corretos. HTTP STATUS: 400 |
| [Erro-PGMEI-MSG_23099] | Houve uma falha na emissão do DAS solicitado. A apuração anterior ainda está em processamento. Para garantir um processo eficiente, envie uma única requisição por vez para o CNPJ {cnpj} e o ano-calendário {ano} informado. Certifique-se de que o CNPJ e o ano-calendário sejam processados de forma sequencial, evitando paralelismo. | Deve-se enviar uma única requisição por vez para um determinado CNPJ e ano-calendário da apuração. O paralelismo de ano-calendário nas apurações provoca essa falha. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_23999] | Falha ao Gerar a Apuração, limite máximo excedido! | Atingiu o limite máximo de apurações retificadoras no ano-calendário. Abra um chamado junto do Fale Conosco da RFB para realizar um procedimento de liberação. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_40000] | Sistema RDOC indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_50000] | Falha no acesso ao sistema FISCEL. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_60000] | Falha no acesso ao sistema PARCMEI. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_61000] | Falha no acesso ao sistema PERTMEI. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_80000] | Falha no acesso ao sistema DasnSimei. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_80001] | Não foi possível transmitir DASN-Simei retificadora de forma automática. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_90000] | Falha no acesso ao sistema Cadastro CNPJ. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Erro-PGMEI-MSG_92000] | Falha no acesso ao sistema SINAC Qualificação. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| [Aviso-PGMEI-25001] | Não há débitos em dívida ativa. | A requisição ocorreu com sucesso, no entanto, não existem débitos em dívida ativa. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_A0001] | O(s) PA {MM/AAAA} estão parcelados e devem ser pagos por meio de DAS gerado no aplicativo de parcelamento. | A requisição ocorreu com sucesso, no entanto, o DAS solicitado se encontra em parcelamento. Não será possível sua geração. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_A0002] | O(s) PA {0} está(ão) em débito automático. | Aviso de que o DAS está em débito automático do PGMEI. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_A0005] | Foi identificada apuração anterior com alíquota de INSS divergente da ocupação profissional exercida no ano-calendário selecionado. Deve ser realizada nova apuração considerando a alíquota correta para os períodos de apuração: {MM/AAAA}. | A requisição ocorreu com sucesso, no entanto, não será possível a emissão até que seja feita apuração para o período indicado. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_A0007] | Você alterou uma informação já declarada. Foi entregue uma DASN-Simei retificadora de forma automática. | A requisição ocorreu com sucesso, no entanto, houve uma transmissão de DASN-Simei retificadora de forma automática. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_A0008] | Não foi possível transmitir DASN-Simei retificadora de forma automática. Regularize a situação utilizando o sistema DASN-Simei. | A requisição ocorreu com sucesso, no entanto, não foi possível transmissão de DASN-Simei retificadora de forma automática. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_A0009] | O total devido contém valores acumulados referentes às apurações anteriores que não atingiram, somados, o valor mínimo permitido para recolhimento, R$10,00 (dez reais). Para detalhes sobre os valores que compõem essa apuração ou caso haja necessidade de informar ou alterar a informação de benefício previdenciário, acesse o PGMEI. | A requisição ocorreu com sucesso, no entanto, o valor total não ultrapassa o valor mínimo permitido pelas regras de negócio. Não será possível a emissão do DAS. HTTP STATUS: 200 |
| [Aviso-PGMEI-MSG_A0010] | Foi identificada apuração anterior com valor de tributo divergente no ano-calendário selecionado. Deve ser realizada nova apuração para os períodos de apuração: {MM/AAAA}. | A requisição ocorreu com sucesso, no entanto, deve ser emitido DAS para os períodos indicados antes dessa emissão. HTTP STATUS: 200 |
