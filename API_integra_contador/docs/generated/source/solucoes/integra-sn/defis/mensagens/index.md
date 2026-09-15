---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "bab24ce5f15b38eacd78f6cf4c1e2659670d0ce4fda3de6b53337b5999647512"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/mensagens/).

# Mensagens específicas para o Integra Simples Nacional - DEFIS

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [EntradaIncorreta-DEFIS-MSG_0001] | O campo campo possui valor inválido. Dever ser numérico com o valor mínimo de valormínimo e o máximo valormaximo . | Corrigir o campo e reenviar. |
| [Erro-DEFIS-MSG_0002] | Houve um erro ao utilizar o sistema. Tente novamente mais tarde. | Erro interno. Reenviar a requisição. |
| [EntradaIncorreta-DEFIS-MSG_0003] | O campo campo possui valor inválido. Dever ser numérico, inteiro e com o valor mínimo de valorminimo e o máximo valormaximo . | Corrigir o campo e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0004] | O campo campo possui valor inválido. | Corrigir o campo e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0005] | O campo campo deve ter o total de total caracteres. | O valor está acima do que o permitido. Corrigir e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0006] | O ano deve estar entre inicio e fim . | Corrigir o valor e reenviar. |
| [Erro-DEFIS-MSG_0007] | Erro no acesso ao Sinac. Tente novamente mais tarde. | Uma integração não está disponível. Tentar novamente mais tarde. |
| [EntradaIncorreta-DEFIS-MSG_0008] | Contribuinte não optante e bloco NaoOptante não preenchido. | Corrigir e reenviar. |
| [Erro-DEFIS-MSG_0009] | Ocorreu um erro durante o acesso ao sistema COMPROT. O número do processo não pôde ser validado. Por favor, tente mais tarde. | Houve um erro em uma integração. Tente novamente mais tarde. |
| [EntradaIncorreta-DEFIS-MSG_0010] | Para administração tributária distrital deve ser passado DF no campo UF. | Corrigir e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0011] | A DEFIS, ano-calendário ano , só poderá ser entregue mediante informação de situação especial. | Foi passado um ano calendário que só pode ser entregue por situação especial |
| [EntradaIncorreta-DEFIS-MSG_0012] | A data do evento não pode ser anterior à data de opção. | Corrigir o campo e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0013] | O evento de situação especial não ocorreu durante o período de opção pelo Simples Nacional. Nesse caso, deve ser entregue declaração normal do exercício subsequente. | Corrigir e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0014] | A data do evento não pode ser anterior à data de abertura da empresa. | Corrigir e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0015] | Cnpj não encontrado. | Corrigir e reenviar. |
| [NãoAutorizado-DEFIS-MSG_0016] | O idDefis não é uma declaração do contribuinte. | Foi passado um idDefis que não corresponde ao contribuinte que fez a autorização. |
| [EntradaIncorreta-DEFIS-MSG_0017] | A data do evento não pode ser superior à data corrente. | Corrigir e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0018] | Para a DEFIS do ano-calendário ano , a data do evento deve ser maior ou igual a 01/01/ AAAA e menor ou igual a 31/12/ AAAA . | Corrigir e reenviar. |
| [Aviso-DEFIS-MSG_0019] | Consta entrega de declaração de situação especial para o ano-calendário de ano . Não é possível a entrega de declaração de situação especial por dois anos consecutivos. | Revisar esta declaração. |
| [Erro-DEFIS-MSG_0020] | Houve um erro ao acesso o PGDASD2018. Tente novamente mais tarde. | Erro interno. Efetuar nova tentativa. |
| [Aviso-DEFIS-MSG_0021] | Não foram efetuadas apurações no PGDASD para o período entre inicio e fim . | Regularizar a situação no sistema PGDASD. |
| [Aviso-DEFIS-MSG_0022] | Existem pendências de apurações para o(s) período(s) de: _MM/AAAA. Regularizar a situação efetuando a transmissão no PGDASD. | Regularizar a situação no sistema PGDASD. |
| [Aviso-DEFIS-MSG_0023] | Não foram enviados todos os estabelecimentos necessários: cnpj . Reenviar a requisição acrescentando estas informações. | Corrigir e reenviar. |
| [Aviso-DEFIS-MSG_0024] | Um ou mais estabelecimentos enviados não pertencem às declarações transmitidas no PGDASD. Reenviar a requisição removendo estas informações: cnpj . | Corrigir e reenviar. |
| [Aviso-DEFIS-MSG_0025] | O indicador de inatividade não corresponde às declarações transmitidas no PGDASD. Se houve atividade no período, deve ser enviado 2. Se as atividades totalizam o valor zero, enviar 0 ou 1 (ver documentação ). | Corrigir e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0026] | A soma da participação dos sócios no capital social da empresa, incluindo cotas em tesouraria, é diferente de 100,00%. | Corrigir e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0027] | Informações duplicadas em campo . | Corrigir os dados duplicados e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0028] | Campo totalEntradas deve ser maior ou igual à soma dos campos: aquisicoesMercadoInterno, importacoes, totalEntradasPorTransferencia e totalDevolucoesVendas. | Corrigir os dados e reenviar. |
| [Erro-DEFIS-MSG_0029] | Houve um erro na transmissão. Tente novamente mais tarde. | Erro interno. |
| [Erro-DEFIS-MSG_0030] | Houve um erro ao recuperar os municípios. | Integração indisponível. Tentar novamente mais tarde. |
| [Erro-DEFIS-MSG_0031] | Houve um erro ao gerar o número do recibo. | Erro interno. Tentar novamente mais tarde. |
| [Erro-DEFIS-MSG_0032] | Município informado inválido. | O código do município é inválido. Corrigir e reenviar. |
| [EntradaIncorreta-DEFIS-MSG_0033] | O municipio não pertence a uf . | O código do município não pertence a UF. Corrigir e reenviar. |
| [Erro-DEFIS-MSG_0034] | Houve um erro ao acessar o sistema CPF. Tente novamente mais tarde. | Erro interno na integração. Tentar novamente mais tarde. |
| [Aviso-DEFIS-MSG_0035] | CPF não encontrado no cadastro CPF. | O CPF não é válido. |
| [Erro-DEFIS-MSG_0036] | Houve um erro ao gerar o Recibo. Tente novamente mais tarde. | Erro interno. |
| [Erro-DEFIS-MSG_0037] | Houve um erro ao gerar o PDF da declaração. Tente novamente mais tarde. | Erro interno. |
| [EntradaIncorreta-DEFIS-MSG_0038] | O Json contém dados inválidos. | O json do campo dados não está em um formato válido. Revise os tipos de campos e estrutura. |
| [EntradaIncorreta-DEFIS-MSG_0039] | Informações sobre mudança de endereço do estabelecimento não pode ter o campo dataMudanca com data anterior ou posterior ao período abrangido dessa declaração. Período abrangido: dd/mm/aaaa a dd/mm/aaaa . | Corrigir o dado e reenviar. |
| [Aviso-DEFIS-MSG_0040] | Contribuinte é optante mas foram enviadas informações no campo naoOptante. Reenviar retirando este bloco. | Corrigir e reenviar. |
| [Aviso-DEFIS-MSG_0041] | Esta empresa ainda não efetuou a Declaração de Informações Socioeconômicas e Fiscais(DEFIS) para o ano-calendário ano . | Deve ser transmitida outra declaração primeiro. |
| [Aviso-DEFIS-MSG_0042] | Não há declaração transmitida para o ano calendário. | Não há declarações para o ano solicitado. |
| [EntradaIncorreta-DEFIS-MSG_0043] | O campo dado não deve possuir nenhum valor. Este serviço consulta todas as declarações transmitidas dentro do período não decadente e não é permitido usar parâmetros. | Retirar qualquer conteúdo do campo dados e reenviar. |
| [Aviso-DEFIS-MSG_0044] | Não foram encontradas declarações transmitidas. |  |
| [Aviso-DEFIS-MSG_0045] | Não foi encontrada declaração para o idDefis informado. | Verificar o idDefis |
| [EntradaIncorreta-DEFIS-MSG_0046] | O campo campo possui mais que 2 casas decimais. Corrija o valor e tente novamente. | Corrigir o valor do campo e reenviar. |
