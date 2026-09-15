---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_lista_de_mensagens_por_contribuintes/"
sourceUpdatedAt: "31 de agosto de 2026 11:10:58 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "515336c3c17153f87a7858989ecef78053f326d455231d80b5f04ba0437947bd"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_lista_de_mensagens_por_contribuintes/).

# Obter Lista de Mensagens por Contribuintes

Obtém uma lista de mensagens da Caixa Postal de um contribuinte.

É possível obter a lista de mensagens filtradas de acordo com o status (lida/não-lida).

Em cada chamada do serviço, serão informados os dados a respeito do autor da consulta e do contribuinte da mensagem. Haverá um retorno on-line, indicando o sucesso ou falha da consulta.

Para consulta de uma grande quantidade de mensagens, o sistema usuário poderá chamar esse serviço quantas vezes for necessário.

PedidoDados

idSistema: CAIXAPOSTAL idServico: MSGCONTRIBUINTE61 versaoSistema: "1.0"

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Domínio | Obrigatório |
| --- | --- | --- | --- | --- |
| cnpjReferencia | Número do CNPJ para filtro. Aplica-se apenas ao caso de contribuinte Pessoa Jurídica. | Number(14) | -- | NÃO |
| statusLeitura | Status lida/não-lida da mensagem. | Number(1) | 0 – Não se aplica 1 – Lida 2 – Não Lida | SIM |
| indicadorFavorito | Indicador favorita/não favorita da mensagem. | Number(1) | 0 – Não favorita 1 –Favorita | NÃO |
| indicadorPagina | Indicador da página que está sendo solicitada. | Number(1) | 0 – Página inicial (contém as mensagens mais recentes) 1 – Página não-inicial | SIM |
| ponteiroPagina | Ponteiro para página. Deve ser preenchido caso se escolha página não-inicial. | Number(14) *Passará a ser definido como Number(24) em 05/09/2026. | -- | NÃO |

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
"idServico": "MSGCONTRIBUINTE61",
"versaoSistema": "1.0",
"dados": "{\"statusLeitura\":\"0\",\"indicadorPagina\":\"\"ponteiroPagina\":\"00000000000000\"}"
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
| indicadorUltimaPagina | Indicador de Última Página. | String(1) | S – Sim N – Não |
| quantidadeMensagens | Quantidade Total de Mensagens Encontradas. Até 50 elementos por página | Number (2) | -- |
| ponteiroPaginaRetornada | Ponteiro Página Anterior. | Number (14) *Passará a ser definido como Number(24) em 05/09/2026. | -- |
| ponteiroProximaPagina | Ponteiro Próxima Página. | Number (6) | -- |
| cnpjMatriz | Número do CNPJ contribuinte Pessoa Jurídica. | Number (14) | -- |
| listaMensagens | Quantidade Total de Mensagens Encontradas. Até 50 elementos | Array of Objeto: Mensagem (50) | -- |

Objeto Mensagem:

| Campo | Descrição | Tipo | Domínio |
| --- | --- | --- | --- |
| codigoSistemaRemetente | Código do sistema remetente no Caixa Postal. | Number (5) | -- |
| codigoModelo | Código do modelo da mensagem. | Number (5) | -- |
| dataEnvio | Data do envio da mensagem. | Number (8) | -- |
| horaEnvio | Hora do envio da mensagem. Formato: HHMMSS. | Number (6) | -- |
| numeroControle | Número de controle da mensagem no formato AAAA/999999999999999. | String (20) | -- |
| indicadorLeitura | Indicador que informa se a mensagem foi lida. |  |  |
| indicadorFavorito | Indicador que informa se a mensagem é favorita ou não | Number (1) | 0 – Não lida 1 – Lida |
| dataLeitura | Data da primeira leitura da mensagem. Formato: AAAAMMDD. | Number (8) | -- |
| horaLeitura | Hora da primeira leitura da mensagem. Formato: HHMMSS. | Number (6) | -- |
| dataExclusao | Data da exclusão da mensagem. Formato: AAAAMMDD. | Number (8) | -- |
| horaExclusao | Hora da exclusão da mensagem. Formato: HHMMSS. | Number (6) | -- |
| dataCiencia | Data da ciência da mensagem. Formato: AAAAMMDD. | Number (8) | -- |
| assuntoModelo | Assunto do modelo da mensagem. | String (300) | -- |
| dataValidade | Data de validade da mensagem. | Number (8) | -- |
| origemModelo | Origem do modelo da mensagem. | Number (1) | 1 – Sistema Remetente 2 – RFB |
| valorParametroAssunto | Valor do parâmetro do assunto. | String (50) | -- |
| relevancia | Indicador de relevância do modelo da mensagem. | Number (1) | 1 – Sem relevância 2 – Com relevância |
| isn | Identificador único do registro da mensagem do contribuinte. | Number (10) | -- |
| tipoOrigem | Indicador do tipo de origem da mensagem. | Number (1) | 1 – Receita 2 – Estado 3 – Município |
| descricaoOrigem | Descrição da origem da mensagem podendo ser o nome da UA, nome do estado ou o nome do município. | String (100) | -- |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [lista de mensagens por contribuintes](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_lista_de_mensagens_por_contribuintes/)

## Exibição do campo assuntoModelo

O campo **assuntoModelo** poderá conter, opcionalmente, um parâmetro com tamanho máximo de 50 caracteres alfanuméricos, que é armazenado no campo **valorParametroAssunto**. Quando esse parâmetro for utilizado, o texto “++VARIAVEL++” é inserido no **assuntoModelo** indicando o local onde ele deverá ser substituído. Por exemplo:

Um modelo de mensagem com o campo assuntoModelo: "[IRPF] Declaração do exercício ++VARIAVEL++ processada", antes de ser exibido, o elemento ++VARIAVEL++ deve ser substituído pelo valor do campo valorParametroAssunto: "2023". Depois de ser substituído o valor no texto, o resultado deve ser: "[IRPF] Declaração do exercício 2023 processada".
