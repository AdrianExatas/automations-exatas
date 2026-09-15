---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "b9044ec98875e841e90af4a4ed915eb9754c14b1d15d953f85da35dac2a879de"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/dasnsimei/mensagens/).

# Mensagens de negócio

## Como interpretar o retorno

A cada chamada é retornado um conjunto de mensagens descrevendo o resultado do processamento. A estrutura do identificador das mensagens retornadas é:

[Tipo-Sistema-Código]

Sistema será "DASNSIMEI" e código será alguns dos valores tabelados nesssa página.

Tipo pode ser:

- EntradaIncorreta: Os dados enviados pelo cliente contêm um ou mais erros que impedem o processamento da requisição.
- Sucesso: A requisição foi processada com sucesso. Isso significa apenas que não houve qualquer erro interno ao processsar a requisição.
- Erro: Houve um erro interno (i.e. do próprio sistema Integra Contador DCTF) ao tentar processar a requisição.
- Aviso: Informações complementares. Podem incluir detalhamento de por que uma operação não irá produzir os resultados esperados pelo cliente (por exemplo, acionou a Consulta de XML de declaração sendo que não existe nenhuma declaração na base correspondente aos dados passados na requisição).

**ATENÇÃO:** Algumas mensagens nas tabelas são modelos que irão conter informações complementares de acordo com cada situação. Os locais onde essas informações complementares podem aparecer estão indicados pelo formato *{N}* em itálico.

**Obs:** Parte das mensagens são descrições sumárias de falhas internas do sistema e visam agilizar a depuração, não correspondendo a qualquer erro da parte do usuário. Caso esteja tendo problemas que não consegue solucionar e opte por abrir um chamado de suporte, anexe ao chamado o JSON recebido como resposta do servidor.

| Código | Mensagem | Ação |
| --- | --- | --- |
| Aviso-DASNSIMEI-10001 | CNPJ inválido: {cnpjCompleto} . | Verificar e corrigir CNPJ. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-10002 | Ano calendário no período de decadência: {anoCalendario} . | Entrega de declaração será aceita somente para os anos-calendários não abrangidos pela decadência. Ou seja, não serão aceitas entregas para os anos-calendário a partir do 6º ano a que se refira. Corrigir o parâmetro inválido antes de acionar o serviço. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-10003 | Contribuinte baixado no Ano calendário {anoCalendario} . | Não é possível entrega de declaração para CNPJ baixado para o ano-calendário informado. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-10004 | Contribuinte não optante pelo Simei no Ano calendário {anoCalendario} . | Informar CNPJ optante. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-10005 | Foi identificada apuração anterior com alíquota de INSS divergente da ocupação profissional exercida no ano-calendário selecionado. Deve ser realizada nova apuração no PGMEI considerando a alíquota correta para os períodos de apuração: {listaPa} . | A requisição ocorreu com sucesso, no entanto, não será possível a emissão até que seja feita apuração para o período indicado. Realizar nova apuração no PGMEI considerando a alíquota correta para os períodos de apuração. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-10006 | Não foi gerado DAS para o ano-calendário {anoCalendario} . Favor regularizar a situação utilizando o sistema PGMEI. | Regularizar a situação utilizando o sistema PGMEI. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-10007 | Não foi gerado DAS para o(s) período(s) {listaPA} . Favor regularizar a situação utilizando o sistema PGMEI. | Regularizar a situação utilizando o sistema PGMEI. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-10008 | A receita bruta total do ano-calendário ultrapassou o limite permitido para enquadramento no SIMEI, não sendo possível a transmissão da DASN-SIMEI. Comunique o desenquadramento obrigatório do SIMEI no Portal do Simples Nacional, nos termos do art. 18-A, § 7º, da Lei Complementar 123/2006. | A receita bruta total informada para o ano-calendário ultrapassou o limite permitido, comunique o desenquadramento obrigatório do SIMEI. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-23006 | Contribuinte não encontrado no Cadastro CNPJ. | Verificar e corrigir CNPJ. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-33001 | Contribuinte não optante pelo Simei. | Informar CNPJ optante. HTTP STATUS: 200 |
| Aviso-DASNSIMEI-33101 | Declaração não possui estouro de receita bruta anual em até 20% para emissão de DAS de excesso de receita. | Última declaração entregue para o ano-calendário informado não tem receita bruta total em excesso para que possa emitir o DAS de excesso de receita. HTTP STATUS: 200 |
| EntradaIncorreta-DASNSIMEI-10000 | Dados de entrada inválidos. | Verificar e corrigir dados de entrada. HTTP STATUS: 400 |
| Erro-DASNSIMEI-23007 | Base CNPJ indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33002 | Sistema SIMEI indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33005 | Sistema Sidat indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33006 | Sistema Numerador indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33007 | Sistema Taco indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33008 | Taxa Selic ainda não cadastrada. Favor acessar novamente no próximo dia útil. | Acessar novamente no próximo dia útil. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33011 | Não foi possível encontrar Auditor disponível no sistema Chancela. | No momento desta requisição não foi encontrado Auditor fiscal que possa assinar a notificação da MAED. Tente novamente mais tarde ou aguarde até o proximo dia útil. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33012 | Sistema indisponível. Falha no sistema Chancela. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33013 | Base de dados DASN-SIMEI indisponível. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33014 | Erro na geração do documento de arrecadação. Falha na execução do sistema SENDA na emissão do Documento de Arrecadação. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33015 | Falha na geração do documento de arrecadação. Erro de validação dos dados de entrada via sistema SENDA. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-33016 | Falha no acionamento ao sistema SENDA. Falha ao emitir o documento de arrecadação. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-50000 | Falha no acesso ao sistema FISCEL. Tente novamente mais tarde. | Uma das integrações internas necessárias a esta operação está indisponível. Tente novamente em outro momento. HTTP STATUS: 500 |
| Erro-DASNSIMEI-40999 | Ocorreu uma falha na execução do serviço. | Ocorreu uma falha interna não prevista na requisição. Tente novamente mais tarde, ou caso não se resolva, reporte o erro no canal apropriado. HTTP STATUS: 500 |
