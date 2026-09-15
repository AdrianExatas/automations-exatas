---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d1f22d4f6a4ec1849ed3656469f2f68081e43d9a02f3d8df274560c069d7facb"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/mensagens/).

# Mensagens específicas para o Integra DCTF

## Como interpretar o retorno

A cada chamada é retornado um conjunto de mensagens descrevendo o resultado do processamento. A estrutura do identificador das mensagens retornadas é:

[Tipo-Sistema-Código]

Sistema será "DCTF" e código será alguns dos valores tabelados nesssa página.

Tipo pode ser:

- EntradaIncorreta: Os dados enviados pelo cliente contêm um ou mais erros que impedem o processamento da requisição.
- Sucesso: A requisição foi processada com sucesso. Isso significa apenas que não houve qualquer erro interno ao processsar a requisição.
- Erro: Houve um erro interno (i.e. do próprio sistema Integra Contador DCTF) ao tentar processar a requisição.
- Aviso: Informações complementares. Podem incluir detalhamento de por que uma operação não irá produzir os resultados esperados pelo cliente (por exemplo, acionou a Consulta de XML de declaração sendo que não existe nenhuma declaração na base correspondente aos dados passados na requisição).

**ATENÇÃO:** Algumas mensagens nas tabelas abaixo são modelos que irão conter informações complementares de acordo com cada situação. Os locais onde essas informações complementares podem aparecer estão indicados pelas letras X, Y e Z em negrito.

**Obs:** Parte das mensagens são descrições sumárias de falhas internas do sistema e visam agilizar a depuração, não correspondendo a qualquer erro da parte do usuário. Caso esteja tendo problemas que não consegue solucionar e opte por abrir um chamado de suporte, anexe ao chamado o JSON recebido como resposta do servidor.

### Mensagens que podem surgir em qualquer serviço

| Código | Mensagem |
| --- | --- |
| MG00 | Requisição efetuada com sucesso |
| MG02 | Encaminhamento não autorizado. |
| MG03 | Tratamento para IdServico não disponível. |
| MG04 | Requisição efetuada com sucesso, mas os parametros implicam em de erro negócio. Veja as demais mensagens para detalhes. |
| MG06 | IdServico desconhecido. |
| MG07 | Dados de requisição inválidos. X |
| MG08 | Não foi encontrada Declaração com os dados informados. |
| MG09 | Dados informados não correspondem aos da declaração com este número recibo. |
| MG10 | A declaração mais recente está na situação "Em Andamento", incompatível com a execução da funcionalidade. Favor informar o "numeroReciboEntrega" para identificar a declaração transmitida. |
| MG11 | X executado com sucesso. |
| MG12 | Exceção inespereada ao tentar executar o(a) X . |
| MG15 | X retornou resposta vazia. |
| MG18 | X executado, mas retornou erro." |
| MG19 | Houve um erro interno ao processar a requisição. Tente novamente mais tarde. |
| MG20 | O campo 'dados' do campo 'pedidoDados' do JSON de requisição está ausente ou é invalido. |
| MG21 | Exceção lançada ao tentar buscar declaração no banco. |
| MSGIC01 | Houve erro de negócio. Favor verificar as demais mensagens. |

### Mensagens específicas do serviço [Consultar XML declaração para transmissão](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_xml_declaracao/)

| Código | Mensagem |
| --- | --- |
| GERAXML01 | Declaracação em estado incompatível com geração de XML. |
| GERAXML02 | Período informado não permitido para entrega da DCTF - WEB. |
| GERAXML03 | O período de apuração da declaração é anterior à existencia legal do contribuinte. |
| GERAXML04 | O valor total de débitos declarados excedeu R$ X . Favor procurar uma unidade da RFB. |
| GERAXML05 | Já existe uma Declaração Ativa para este CNPJ Base X , porém pertencente a outro CNPJ completo( Y ). |
| GERAXML06 | O número de inscrição X está em situação Y no CNPJ. Compareça à unidade local da Receita Federal. |
| GERAXML07 | Não há data estabelecida para a situação do número de inscrição X no CNPJ. Compareça à unidade local da Receita Federal. |
| GERAXML08 | A DCTFWeb deve ser entregue pela matriz, X , da Pessoa Jurídica no cadastro da Receita Federal. O CNPJ informado foi Y . |
| GERAXML09 | A soma do valor da vinculação da retenção na declaração mensal de dezembro ( X ) e do adiantamento da retenção na declaração de anual de décimo terceiro( Y ) é superior ao valor do crédito disponível na declaração do mês de dezembro( Z ). Proceda à sua regularização. |

### Mensagens específicas do serviço [Transmitir Declaração](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/entregar_declaracao/)

| Código | Mensagem |
| --- | --- |
| TRANS01 | Estado da declaração não permite transmissão. |
| TRANS02 | XML com formato inválido enviado para transmissão. X . |
| TRANS04 | XML com conteúdo inválido enviado para transmissão. X . |
| TRANS05 | Houve um erro ao tratar o elemento do XML. Algum elemento de seu conteúdo não está no formato esperado (confira, por exemplo, se o elemento < X 509Certificate> é um base64 válido). |
| TRANS07 | Não foi encontrado XML Gerado para validar a autenticidade do XML Assinado. |
| TRANS09 | Assinatura inválida: X |
| TRANS10 | A declaração foi atualizada depois da geração do XML que está sendo transmitido. |
| TRANS11 | A declaração já foi transmitida. |
| TRANS12 | A declaração não foi transmitida. |
| TRANS13 | A DCTFWeb do contribuinte neste período de apuração está disponível apenas para consulta, não sendo possível transmiti-la. Embora esteja obrigado à entrega do eSocial/EFD-Reinf, neste PA, o contribuinte não se enquadra nas regras de obrigatoriedade da DCTFWeb, elencadas na IN RFB nº 2.005/2021. |
| TRANS14 | Por ter sido entregue fora do prazo, ensejou a aplicação de Multa por Atraso na Entrega da DCTFWeb(MAED). Para visualizar a Notificação de Lançamento e o DARF da MAED acesse a DCTFWeb via Portal e-CAC. |
| TRANS20 | Erro ao tentar persistir transmissão. |
| TRANS15 | O XML não é bem-formado. Confira a corretude de sua estrutura (como a presença de um único elemento raiz e o fechamento de todas as tags). |
| TRANS16 | Erro ao carregar XML. O XML recebido deveria ser a declaração gerada pelo DCTF acrescida da assinatura digital - se o XML não foi adulterado e a assinatura foi feita corretamente, não há margem para esse erro. Verifique que XML esta sendo enviado. |
| TRANS17 | A tag Signature deve ser filha da tag ProcDctf. |
| TRANS18 | Erro ao processar elemento Signature do XML. Verifique a validade dos elementos SignatureValue e SignedInfo do XML. |
| TRANS19 | Certificado inválido: X |
| TRANS20 | O campo XMLAssinadoBase64 não contém um base 64 válido |
| TRANS21 | O campo XMLAssinadoBase64 é obrigatório |
| TRANS22 | Erro ao carregar dados do certificado, alguns campos parecem estar ausentes - verifique se o mesmo não está corrompido |

### Mensagens específicas dos serviços [Consultar Declaração Completa](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_declaracao_completa/) e [Consultar Recibo de transmissão](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_recibo/)

| Código | Mensagem |
| --- | --- |
| RELAT00 | Não foi encontrada declaração ativa para a geração do relatório |
| RELAT01 | Erro ao consultar os dados base do(a) X |
| RELAT02 | Erro ao gerar HTML do(a) X |
| RELAT03 | Erro ao imprimir o PDF do(a) X |

### Mensagens do serviço [Gerar Documento de Arrecadação](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/gerar_guia/)

| Código | Mensagem |
| --- | --- |
| APIGUIA01 | Não é permitido emitir guia de pagamento de declarações não ativas. |
| APIGUIA02 | Data proposta para acolhimento de guia inválida. Motivo: X |
| APIGUIA03 | IdSistemaOrigem inválido: X |
| GUIA00 | Não será possível emitir a Guia nesta data. A Taxa Selic para o próximo mês ainda não foi divulgada. Emita a Guia no próximo dia útil. |
| GUIA01 | Não é permitido emitir guia de pagamento de declarações não ativas. |
| GUIA02 | Atenção! O saldo a pagar é inferior a R$ X . A guia de pagamento não poderá ser emitida. Verifique na relação de declarações se há valores devidos inferiores a R$ X que acumulados ultrapassem R$ X e/ou efetue o pagamento junto com o débito da declaração imediatamente posterior. Não haverá cobrança de acréscimos legais. |
| GUIA03 | Não há débitos com saldo a pagar para emissão da guia de pagamento. |
| GUIA04 | Houve um erro na etapa ' X ' da emissão de guia de pagamento. |
| GUIA05 | Data proposta para acolhimento de guia inválida. Motivo: X |
| GUIA06 | A chamada deve conter uma proposta de data para acolhimento da guia. |
| GUIA07 | Esse serviço não suporta proposição de data acolhimento. Favor chamar o serviço de emissão de guia que permite esse parâmetro. |
| GUIA08 | A declaração possui débitos com impedimento. Consulte a sua Situação Fiscal no portal eCAC, https://cav.receita.fazenda.gov.br , para gerar o documento de arrecadação. |
| GUIA09 | A declaração de recibo X possui débitos com impedimento, mas o documento de arrecadação foi emitido contendo tributos dos grupos Consignado (se não vencidos) e FGTS. |
| GUIA10 | O sistema de validação da situação fiscal está indisponível (isso não impede a geração da guia). Motivo: X |
| GUIA11 | O documento de arrecadação não possui características válidas para validação da Situação Fiscal. X |
| GUIA12 | Houve um erro na chamada do serviço de verificacao de débitos impedidos. X |
| GUIA13 | Prezado contribuinte. O valor da guia a ser gerada é maior que R$ X limite permitido para pagamento na rede bancária. |
| GUIA14 | O sistema só emite DARF de MAED até a data de vencimento da multa: X . |
| GUIA15 | A(s) declaração(ões) de recibo(s) [ X ] possui(em) débitos com impedimento. Consulte a sua Situação Fiscal no portal eCAC, https://cav.receita.fazenda.gov.br , para gerar o documento de arrecadação desta(s) declaração(ões). |
| GUIA16 | A(s) declaração(ões) de recibo(s) [ X ] não possui(em) débitos com saldo a pagar. |
| GUIA17 | X Y (essa mensagem sumariza motivos da não emissão de guia) |
| GUIA18 | A declaração possui débitos de consignado vencidos. Desmarque o código de receita do consignado e tente novamente. |
| GUIA19 | O documento de arrecadação foi emitido parcialmente, ou seja, sem alguns débitos. X Y |
| GUIA20 | A declaração possui débitos com impedimento, mas o documento de arrecadação foi emitido contendo tributos dos grupos Consignado (se não vencidos) e FGTS. Consulte a sua Situação Fiscal no portal eCAC, https://cav.receita.fazenda.gov.br , para gerar documento de arrecadação com os débitos em impedimento. |
