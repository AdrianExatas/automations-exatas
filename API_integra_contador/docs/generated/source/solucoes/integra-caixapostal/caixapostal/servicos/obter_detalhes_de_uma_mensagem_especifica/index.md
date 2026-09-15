---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_detalhes_de_uma_mensagem_especifica/"
sourceUpdatedAt: "31 de agosto de 2026 11:10:58 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "269958b89a9757f936f87016b4ba308420fc6c02510840d46e35d3717aba4bc2"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_detalhes_de_uma_mensagem_especifica/).

# Obter Detalhes de uma Mensagem Específica

Obtém os detalhes de uma mensagem específica.

⚠️ **Importante:** Assim como na aplicação Caixa Postal do portal e-CAC, a execução deste serviço caracteriza ciência da intimação, nos termos do art. 23, § 2º, inciso III, do Decreto nº 70.235/1972.

Em cada chamada do serviço, serão informados os dados a respeito do autor da consulta e do contribuinte da mensagem. Haverá um retorno on-line, indicando o sucesso ou falha da consulta.

Para consulta de uma grande quantidade de mensagens, o sistema usuário poderá chamar esse serviço quantas vezes for necessário.

PedidoDados

idSistema: CAIXAPOSTAL idServico: MSGDETALHAMENTO62 versaoSistema: "1.0"

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Domínio | Obrigatório |
| --- | --- | --- | --- | --- |
| isn | Identificador único do registro da mensagem do contribuinte.. | Number(10) | -- | SIM |

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "CAIXAPOSTAL",
"idServico": "MSGDETALHAMENTO62",
"versaoSistema": "1.0",
"dados": "{\"isn\":\"0000082838\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. | Array of String |
| dados | Estrutura de dados de retorno. | String (SCAPED STRING JSON: Dados) |

Objeto: Dados

| Campo | Descrição | Tipo | Domínio |
| --- | --- | --- | --- |
| codigo | Resultado da Requisição. | Number (2) | Tabela: Lista códigos de retorno |
| conteudo | Mensagens Encontradas. | Array of Objeto: Mensagem (100) | -- |

Objeto Mensagem:

| Campo | Descrição | Tipo | Domínio |
| --- | --- | --- | --- |
| codigoSistemaRemetente | Código do sistema remetente no Caixa Postal. | Number (5) | -- |
| codigoModelo | Código do modelo da mensagem. | Number (5) | -- |
| dataEnvio | Data do envio da mensagem. | Number (8) | -- |
| horaEnvio | Hora do envio da mensagem. Formato: HHMMSS. | Number (6) | -- |
| numeroControle | Número de controle da mensagem no formato AAAA/999999999999999. | String (20) | -- |
| indFavorito | Indicador que informa se a mensagem é favorita ou não | Number(1)) | 0 – Não favorita 1 –Favorita |
| dataLeitura | Data da primeira leitura da mensagem. Formato: AAAAMMDD. | Number (8) | -- |
| horaLeitura | Hora da primeira leitura da mensagem. Formato: HHMMSS. | Number (6) | -- |
| dataExclusao | Data da exclusão da mensagem. Formato: AAAAMMDD. | Number (8) | -- |
| horaExclusao | Hora da exclusão da mensagem. Formato: HHMMSS. | Number (6) | -- |
| dataCiencia | Data da ciência da mensagem. Formato: AAAAMMDD. | Number (8) | -- |
| assuntoModelo | Assunto do modelo da mensagem. | String (300) | -- |
| dataExpiracao | Data de expiração da mensagem. | Number (8) | -- |
| origemModelo | Origem do modelo da mensagem. | Number (1) | 1 – Sistema Remetente 2 – RFB |
| valorParametroAssunto | Valor do parâmetro do assunto. | String (50) | -- |
| relevancia | Indicador de relevância do modelo da mensagem. | Number (1) | 1 – Sem relevância 2 – Com relevância |
| isn | Identificador único do registro da mensagem do contribuinte. | Number (10) | -- |
| tipoOrigem | Indicador do tipo de origem da mensagem. | Number (1) | 1 – Receita 2 – Estado 3 – Município |
| descricaoOrigem | Descrição da origem da mensagem podendo ser o nome da UA, nome do estado ou o nome do município. | String (100) | -- |
| corpoModelo | Texto do corpo do modelo de mensagem | String (10500) | -- |
| variaveis | Valores dos parâmetros do corpo da mensagem. A quantidade de elementos do array depende da quantidade de variáveis do modelo de mensagem. | Array de Strings | -- |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [lista de mensagens por contribuintes](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_detalhes_de_uma_mensagem_especifica/)

## Exibição do campo assuntoModelo

O campo **assuntoModelo** poderá conter, opcionalmente, um parâmetro com tamanho máximo de 50 caracteres alfanuméricos, que é armazenado no campo **valorParametroAssunto**. Quando esse parâmetro for utilizado, o texto “++VARIAVEL++” é inserido no **assuntoModelo** indicando o local onde ele deverá ser substituído. Por exemplo:

Um modelo de mensagem com o campo assuntoModelo: "[IRPF] Declaração do exercício ++VARIAVEL++ processada", antes de ser exibido, o elemento ++VARIAVEL++ deve ser substituído pelo valor do campo valorParametroAssunto: "2023". Depois de ser substituído o valor no texto, o resultado deve ser: "[IRPF] Declaração do exercício 2023 processada".

## Exibição do campo corpoModelo

O campo **corpoModelo** contém o corpo da mensagem e esta poderá conter, opcionalmente, “*n*” parâmetros, sendo "n" um número de 1 até 40. Quando os parâmetros forem utilizados, o texto “++y++” (onde y é um número sequencial), é inserido no corpo na mensagem indicando o(s) local(is) onde o parâmetro será substituído. Os parâmetros estão definidos no campo **variaveis** que contém uma lista de String. Por exemplo:

Uma mensagem com o campo **corpoModelo** contendo o valor: "A Declaração do exercício ++1++ foi processada e encontra-se disponível em ++2++" e o campo **variaveis** com o valor: "[2010,http://receita.fazenda]". Antes de exibir o conteúdo da mensagem, os parametros ++1++ e ++2++ devem ser substituídos pelos valores: "2010" e "http://receita.fazenda" respectivamente, conforme a ordem no campo **variaveis**. O resultado deve ser: "A Declaração do exercício 2010 foi processada e encontra-se disponível em http://receita.fazenda".
