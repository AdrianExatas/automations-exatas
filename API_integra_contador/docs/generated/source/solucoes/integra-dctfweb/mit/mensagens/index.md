---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "3873c8176819621649e5b7855a507ce70f31981eb50ca97e43de89e4e17e7cce"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/mensagens/).

# Mensagens Integra-DCTFWeb: MIT

## Como interpretar o retorno

A cada chamada é retornado um conjunto de mensagens descrevendo o resultado do processamento. A estrutura do identificador das mensagens retornadas é:

[Tipo-Sistema-Código]

Sistema será "MIT" e código será alguns dos valores tabelados nesssa página.

Tipo pode ser:

- EntradaIncorreta: Os dados enviados pelo cliente contêm um ou mais erros que impedem o processamento da requisição.
- Sucesso: A requisição foi processada com sucesso. Isso significa apenas que não houve qualquer erro interno ao processsar a requisição.
- Erro: Houve um erro interno (i.e. do próprio sistema Integra Contador DCTF) ao tentar processar a requisição.
- Aviso: Informações complementares. Podem incluir detalhamento de por que uma operação não irá produzir os resultados esperados pelo cliente (por exemplo, acionou a Consulta de XML de declaração sendo que não existe nenhuma declaração na base correspondente aos dados passados na requisição).

**ATENÇÃO:** Algumas mensagens nas tabelas são modelos que irão conter informações complementares de acordo com cada situação. Os locais onde essas informações complementares podem aparecer estão indicados pelo formato **{N}** em negrito.

**Obs:** Parte das mensagens são descrições sumárias de falhas internas do sistema e visam agilizar a depuração, não correspondendo a qualquer erro da parte do usuário. Caso esteja tendo problemas que não consegue solucionar e opte por abrir um chamado de suporte, anexe ao chamado o JSON recebido como resposta do servidor.

### Mensagens específicas dos serviços MIT

| Código | Mensagem | Ação |
| --- | --- | --- |
| MSG_0001 | Houve um erro ao acessar o Integra Contador DCTF - MIT | Tentar em um momento posterior. |
| MSG_0002 | O Json contém dados inválidos - {0} | Corrigir o campo que está inválido e reenviar a requisição. |
| MSG_0003 | O campo {0} possui valor inválido ou nulo. | Corrigir o campo que está inválido e reenviar a requisição. |
| MSG_0004 | Para apuração sem movimento não é permitido informar o campo {0} . | Apuração sem movimento não permite o envio de determinados campos. Corrigir e reenviar a requisição. |
| MSG_0005 | Para apuração com movimento é obrigatório informar o campo {0} . | Apuração com movimento possui campos obrigatórios. Corrigir e reenviar a requisição. |
| MSG_0006 | O campo {0} é obrigatório quando {1} for {2} . | Corrigir e reenviar a requisição. |
| MSG_0007 | O campo {0} é obrigatório quando {1} . | Corrigir e reenviar a requisição. |
| MSG_0008 | O campo {0} só pode existir se existir {1} . | Corrigir e reenviar a requisição. |
| MSG_0009 | Os valores de {0} devem ser uma sequência numérica começando em 1. | Corrigir a sequência e reenviar a requisição. |
| MSG_0010 | O campo {0} precisa ter valor preenchido. Consulte a documentação para entender a razão. | Determinados campos possuem regras específicas para envio. Corrigir e reenviar a requisição. |
| MSG_0011 | O campo {0} precisa ter um correspondente em {1} . | Corrigir e reenviar a requisição. |
| MSG_0012 | O campo {0} do codigoDebito {1} possui valor inválido. | Corrigir e reenviar a requisição. |
| MSG_0013 | É obrigatório o preenchimento do campo {0} para o tributo {1} . | Corrigir e reenviar a requisição. |
| MSG_0014 | O campo {0} só deve ser preenchido para o(s) tributo(s) {1} . | Corrigir e reenviar a requisição. |
| MSG_0015 | A lista {0} está vazia. Se não há conteúdo, não deve ser enviada. | Corrigir e reenviar a requisição. |
| MSG_0016 | A lista {0} só pode ser preenchida se não existir {1} . | Corrigir e reenviar a requisição. |
| MSG_0017 | O campo numeroProcesso deve conter 17 (administrativo) ou 20 dígitos (judicial). | Corrigir e reenviar a requisição. |
| MSG_0018 | O codigoDebito {0} não é permitido. Consulte a documentação para maiores detalhes. | Corrigir e reenviar a requisição. |
| MSG_0019 | O campo {0} precisa estar entre {1} e {2} . | Corrigir e reenviar a requisição. |
| MSG_0020 | O campo transmissaoImediata só deve ser enviado para apuração sem movimento. | Corrigir e reenviar a requisição. |
| MSG_0021 | Campo {0} não encontrado na tabela de Orgãos e Municípios. | O campo com o código do Município está inválido. |
| MSG_0022 | Não encontrado o {0} no cadastro CNPJ. | Corrigir e reenviar a requisição. |
| MSG_0023 | Não existe apuração com o número informado: {0} | O número da apuração obtido está inválido. |
| MSG_0024 | A apuração foi enviada para encerramento na DCTFWEB. Se desejar saber o status do encerramento, utilize a funcionalidade Consultar Situação de Encerramento, passando o conteúdo do campo protocoloEncerramento devolvido nesta requisição. |  |
| MSG_0025 | Não existem apurações para o CNPJ {0} e ano {1} . |  |
| MSG_0026 | O campo codigoDebito {0} não existe no sistema MIT. | Corrigir e reenviar a requisição. |
| MSG_0027 | O codigoDebito {0} não é permitido no mêsApuracao {1} . | Corrigir e reenviar a requisição. |
| MSG_0028 | Existem débitos duplicados. | Corrigir e reenviar a requisição. |
| MSG_0029 | O campo {0} é obrigatório. | Corrigir e reenviar a requisição. |
| MSG_0030 | Não é permitido mais de um eventoSituacaoEspecial para o tipoEvento diferente de 4 ou 6. | Corrigir e reenviar a requisição. |
| MSG_0031 | O campo {0} não pode ter valor maior que {1} . | Corrigir e reenviar a requisição. |
| MSG_0032 | O {0} não corresponde a uma apuração do contribuinte {1} . | O idApuracao enviado não pertence ao contribuinte autenticado. |
| MSG_0033 | CNPJ {0} não encontrado no cadastro CNPJ. | Corrigir e reenviar a requisição. |
| MSG_0034 | São permitidos o total de 5 eventos especiais por apuração. | Corrigir e reenviar a requisição. |
| MSG_0035 | O campo {0} é incompatível com o valor informado no(s) campo(s) DadosIniciais.QualificacaoPj e/ou DadosIniciais.TributacaoLucro | Corrigir e reenviar a requisição. |
| MSG_0036 | Existe uma apuração em encerramento do mesmo CNPJ e PA. Aguarde a conclusão do encerramento antes de enviar uma retificação. | Aguarde mais alguns minutos ou utilize o serviço de consultarSituacaoEncerramento |
