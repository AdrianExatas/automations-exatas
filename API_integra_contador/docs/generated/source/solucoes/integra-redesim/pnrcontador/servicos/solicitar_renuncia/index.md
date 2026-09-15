---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/solicitar_renuncia/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "96317b1f8929b6e2db86bb301a2977ecb608d884f86049b42935aae96077ea3a"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/solicitar_renuncia/).

# Solicitar Renúncia

Este serviço permite ao contador solicitar a renúncia a um vínculo contabilista entre um contador e uma empresa.

Identificação no Pedido de Dados

idSistema: PNRCONTADOR idServico: SOLICRENUNCIA262

**Dados de Entrada**

Para que a solicitação seja válida, é necessário que o `autorPedidoDados` informados na requisição, tenham o mesmo NI do `solicitacaoRenunciaContador.cpfContador` ou do `solicitacaoRenunciaContador.cnpjEmpresaContabil`. Não é permitido que um autor do pedido de dados realize uma solicitação de renúncia para outro contador.

CPF do Preenchedor(`solicitacaoRenunciaContador.cpfPreenchedor`): Informe o mesmo CPF do autor do pedido de dados. Caso o pedido seja feito por uma pessoa jurídica, deve ser informado o CPF do responsável vinculado ao eCNPJ da empresa. Internamente será feito uma verificação para garantir que o CPF do Preenchedor seja o mesmo do CPF do responsável pela solicitação da renúncia.

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| solicitacaoRenunciaContador | Solicitação de renúncia | Objeto SolicitacaoRenuncia | SIM |
| cienciaDeclaracoes | Este campo deve ser enviado com a confirmação do aceite do Autor do Pedido de Dados para as Declarações exigidas para a renúncia. | boolean | SIM |

#### Objeto: SolicitacaoRenuncia

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cnpj | CNPJ da empresa com a qual deseja renunciar vínculo. Número do CNPJ completo (incluindo o DV). Só são aceitos números e sem a máscara de formatação. | Texto (14) | SIM |
| cpfContador | CPF do profissional contábil renunciante, incluindo o DV, sem a máscara de formatação. | Texto (11) | NÃO |
| cnpjEmpresaContabil | CNPJ da empresa contábil renunciante, incluindo o DV, sem a máscara de formatação. | Texto (14) | NÃO |
| cpfPreenchedor | CPF do preenchedor da solicitação incluindo o DV, sem a máscara de formatação. | Texto (11) | SIM |

#### Declarações

| Número | Declaração |
| --- | --- |
| 1 | Declaro que estou renunciando ao vínculo de PROFISSIONAL CONTÁBIL com a pessoa jurídica. |
| 2 | Estou ciente de que esta RENÚNCIA será informada à Administração Tributária do Estado e do Município de jurisdição da pessoa jurídica via sistema eletrônico da REDESIM. |
| 3 | Estou ciente de que devo comunicar esta RENÚNCIA imediatamente à pessoa jurídica referida, ressalvadas situações de vinculação notoriamente viciada ou fraudulenta. |
| 4 | Estou ciente de que esta RENÚNCIA é irretratável e que eventual restabelecimento do vínculo compete exclusivamente à pessoa jurídica mediante nova indicação do PROFISSIONAL CONTÁBIL por meio do Coletor Nacional da REDESIM. |

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
"numero": "00000000011",
"tipo": 1
},
"pedidoDados": {
"idSistema": "PNRCONTADOR",
"idServico": "SOLICRENUNCIA262",
"versaoSistema": "1.0",
"dados": "{ \"solicitacaoRenunciaContador\": { \"cnpj\"\"99999999999999\", \"cpfContador\": \"00000000011\"\"cnpjEmpresaContabil\": \"00000000000100\", \"cpfPreenchedor\"\"00000000011\" }, \"cienciaDeclaracoes\": false }"
}
}
```

**Dados de Saída**

É retornado o ID da solicitação de renúncia. Após a solicitação, é possível utilizar o serviço [Situação Solicitar Renúncia](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/servicos/situacao_solicitar_renuncia/) para consultar a situação da solicitação. É recomendado um intervalo de pelo menos 30 segundos entre essas requisições, para garantir que a renúncia já tenha sido processada.

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Texto (3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É uma lista composta de código e texto da mensagem. O campo código é um texto que representa um código interno do negócio. | Lista de Objetos Mensagem |
| dados | ID da solicitação da renúncia. | Objeto idSolicitacao |

#### Objeto: Mensagem

| Campo | Descrição | Tipo |
| --- | --- | --- |
| codigo | Código da mensagem retornada pelo serviço. | Texto |
| texto | Texto explicativo da mensagem. | Texto |

#### Objeto: idSolicitacao

| Campo | Descrição | Tipo |
| --- | --- | --- |
| idSolicitacao | ID da solicitação de renúncia | Texto |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Solicitar Renúncia](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/exemplos/retorno_solicitar_renuncia/)
