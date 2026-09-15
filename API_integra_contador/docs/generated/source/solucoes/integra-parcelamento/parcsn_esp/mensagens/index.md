---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "2af761b51be8b3bc29a826c6c210cf0bb23c1e9cc528367be87ab36a669c4e03"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-parcelamento/parcsn_esp/mensagens/).

# Mensagens específicas para o Integra Parcelamento - PARCSN ESPECIAL

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Aviso-PARCSN-ESP-ER_E001] | Não há parcelamento ativo para o contribuinte. | O número do parcelamento informado não está ativo ou não existe. |
| [Erro-PARCSN-ESP-ER_N001] | Erro ao utilizar o Integra Contador Parcelamentos. Tente novamente mais tarde. | Erro interno. Efetuar nova tentativa. |
| [EntradaIncorreta-PARCSN-ESP-ER_N002] | Parâmetro de entrada inválido: {}. | Foi enviado um parâmetro de forma incorreta. Reenviar corrigindo o problema. |
| [Aviso-PARCSN-ESP-ER_N003] | Não há mais saldo devedor para os débitos incluídos no parcelamento. No próximo processamento mensal, o parcelamento será encerrado. | Não há parcela disponível. |
| [EntradaIncorreta-PARCSN-ESP-ER_N004] | Houve uma reconsolidação do parcelamento. Não é possível utilizar o Integra Contador para esta ação, que deve ser feita diretamente no portal do contribuinte ou eCac. | Quando há reconsolidação, deve ser utilizada a versão web. |
| [Aviso-PARCSN-ESP-ER_N005] | O DAS da parcela do mês corrente só pode ser emitido a partir do dia {}. | Reenviar a partir do dia indicado. |
| [Aviso-PARCSN-ESP-ER_N006] | A parcela {0} está indisponível para impressão devido a um dos seguintes motivos: 1- A parcela não existe no parcelamento; 2- Já existe pagamento para a parcela ou 3- É uma parcela de um mês futuro ainda não disponível. | Foi solicitada uma parcela que não está disponível para o parcelamento solicitado. |
| [EntradaIncorreta-PARCSN-ESP-ER_N007] | Esta funcionalidade não requer nenhuma informação no campo dados. Remova e envie novamente a requisição. | Foram enviados parâmetros de entrada desnecessários. Reenviar retirando os parâmetros. |
| [Aviso-PARCSN-ESP-ER_N008] | Não foram encontradas parcelas para emissão. | Não há parcelas para o parcelamento solicitado. |
| [Aviso-PARCSN-ESP-ER_N009] | Não existe parcelamento para o numeroParcelamento informado. | Verificar o número do parcelamento passado no parâmetro |
| [Aviso-PARCSN-ESP-ER_N010] | A parcela {} informada não é uma parcela válida para consulta de pagamento do parcelamento {}. | Foi passada uma parcela que não existe ou não possui pagamento. |
| [Aviso-PARCSN-ESP-ER_N011] | Não existe parcelamento com o número informado. | Reenviar corrigindo o parâmetro. |
| [Aviso-PARCSN-ESP-ER_N012] | Não existe pagamento para o anoMesParcela e numeroParcelamento informados. | Não existe pagamento para a parcela informada. |
| [Aviso-PARCSN-ESP-ER_N013] | Há um pedido de parcelamento para o contribuinte aguardando confirmação do pagamento da primeira parcela. Mensalmente, após a confirmação, estarão disponíveis os documentos para pagamento das demais. | Aguardar o pagamento. |
| [Aviso-PARCSN-ESP-ER_N014] | Informe a parcela {0} na requisição para obter o documento de arrecadação da primeira parcela. | Mensagem que pode ser emitida em conjunto com outra. Deve ser corrigido o parâmetro de entrada. |
