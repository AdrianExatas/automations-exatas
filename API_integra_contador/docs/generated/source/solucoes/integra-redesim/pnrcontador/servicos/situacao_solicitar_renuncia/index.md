---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/situacao_solicitar_renuncia/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "9e70eea45b8d711323c3f30c9dea092047016932087bfc55803136ec442f7985"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/situacao_solicitar_renuncia/).

# Situação do Solicitar Renúncia

Este serviço permite ao contador consultar a situação da solicitação de renúncia feita realizada usando o serviço [Solicitar Renúncia](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/solicitar_renuncia/).

ATENÇÃO

É recomendado um intervalo de pelo menos 30 segundos entre a solicitação de renúncia e a consulta de situação, para garantir que a renúncia já tenha sido processada e minimizar as cobranças com consultas de situação.

Identificação no Pedido de Dados

idSistema: PNRCONTADOR idServico: SITSOLICRENUNCIA265

**Dados de Entrada**

Para realizar a consulta, é necessário que o `autorPedidoDados` informado na requisição, seja solicitante ou renunciante da solicitação informada informada no campo `pedidoDados.dados.idSolicitacao`.

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| idSolicitacao | ID da solicitação de renúncia | Texto | SIM |

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "00000000000100",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000100",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000100",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "SITSOLICRENUNCIA265",
"versaoSistema": "1.0",
"dados": "{ \"idSolicitacao\"\"PNRCONTADOR-20250212-af81730aeb29c9fdac15\" }"
}
}
```

**Dados de Saída**

É retornada a situação atual da solicitação de renúncia.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Texto (3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É uma lista composta de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. | Lista de Objetos Mensagem |
| dados | Situação da solicitação de renúncia | Objeto sitSolicitacao |

#### Objeto: Mensagem

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da mensagem retornada pelo serviço. | Texto |
| texto | Texto explicativo da mensagem. | Texto |

#### Objeto: sitSolicitacao

| Campo | Descrição | Tipo |
| --- | --- | --- |
| resultado | Indica se a solicitação já foi aprovada ou não | Booleano |
| mensagemRetorno | Mensagem detalhando a situação da solicitação de renúncia | Texto |
| renuncia | Dados da renúncia, quando efetivada. Pode ser nulo quando a renúncia ainda não foi efetivada ou foi negada. | Objeto Renúncia |

#### Objeto: Renúncia

Os campos `cnpjSolicitante`, `cnpjRenunciante`, `cpfSolicitante` e `cpfRenunciante` podem ser nulos. No entanto, pelo menos um dos campos `Solicitante` será sempre preenchido, e pelo menos um dos campos `Renunciante` será sempre preenchido. Isso indica se o autor da renúncia foi uma pessoa física ou jurídica.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| id | Identificador único da renúncia. | Número |
| cnpjRenunciada | CNPJ da empresa que foi renunciada. | Texto |
| dataRenuncia | Data da renúncia em milissegundos (timestamp). | Número (timestamp) |
| cnpjSolicitante | CNPJ do solicitante da renúncia (pode ser nulo). | Texto |
| cnpjRenunciante | CNPJ do renunciante (pode ser nulo). | Texto |
| cpfSolicitante | CPF do solicitante da renúncia (pode ser nulo). | Texto |
| cpfRenunciante | CPF do renunciante (pode ser nulo). | Texto |
| cpfLogado | CPF do usuário logado que realizou a requisição. | Texto |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Situação Solicitar Renúncia](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_situacao_solicitar_renuncia/)
