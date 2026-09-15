---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/entregar_entrada/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "34ecb254d2c4c8fd13ae89dfdb815cfb5cc0ca1bf059f4cdf0bb6c338a642e02"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/entregar_entrada/).

# Transmitir a Declaração Sócio Econômica - DEFIS

Permitir a transmissão da declaração

PedidoDados

idSistema: DEFIS idServico: TRANSDECLARACAO141 versaoSistema: "1.0"

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| ano | Ano calendário | Number | SIM |
| situacaoEspecial | Informações de situacaoEspecial | Object | NÃO |
| inatividade | Resposta à pergunta sobre inatividade. Ver Regra . | Number | SIM (somente para AC anterior a 2025) |
| empresa | Informações da matriz. Ver empresa . | Object | SIM |

Objeto situacaoEspecial:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| tipoEvento | Tipo do evento com 1 dígito. | Number | SIM |
| dataEvento | Data do evento da situação especial no formato AAAAMMDD. | Number | SIM |

Objeto empresa:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| ganhoCapital | Ganhos de capital | Number | SIM |
| qtdEmpregadoInicial | Quantidade de empregados no ínicio do Ano Calendário | Number | SIM |
| qtdEmpregadoFinal | Quantidade de empregados no final do Ano Calendário | Number | SIM |
| lucroContabil | Caso a ME/EPP mantenha escrituração contábil e tenha evidenciado lucro superior ao limite de que trata o § 1º do art. 131 da Resolução CGSN nº 94, de 29/11/2011, no período abrangido por esta declaração, informe o valor do lucro contábil apurado | Number | NÃO |
| receitaExportacaoDireta | Receita proveniente de exportação direta | Number | SIM |
| comerciaisExportadoras | Receitas provenientes de exportação por meio de comercial exportadora. | Array de Object comercialExportadora | NÃO |
| socios | Identificação e rendimentos dos sócios. | Array de Object socio | SIM |
| participacaoCotasTesouraria | Percentual de participação em cotas em tesouraria no capital social da empresa | Number | NÃO |
| ganhoRendaVariavel | Total de ganhos líquidos auferidos em operações de renda variável | Number | SIM |
| doacoesCampanhaEleitoral | Doações à Campanha Eleitoral. | Array de Object doacao | NÃO |
| estabelecimentos | Lista de estabelecimentos. | Array de Object estabelecimento | SIM |
| naoOptante | Informação de não optante. Ver naoOptante | Object | NÃO |

Objeto comercialExportadora:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cnpjCompleto | CNPJ completo | String (14) | SIM |
| valor | Valor | Number | SIM |

Objeto socio:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cpf | CPF do sócio - somente números | String (11) | SIM |
| rendimentosIsentos | Rendimentos isentos pagos ao sócio pela empresa | Number | SIM |
| rendimentosTributaveis | Rendimentos tributáveis pagos ao sócio pela empresa | Number | SIM |
| participacaoCapitalSocial | Percentual de participação do sócio no capital social da empresa no último dia do período abrangido pela declaração | Number | SIM |
| irRetidoFonte | Imposto de renda retido na fonte sobre os rendimentos pagos ao sócio pela ME/EPP | Number | SIM |

Objeto doacao:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cnpjBeneficiario | CNPJ beneficiário | String (14) | SIM |
| tipoBeneficiario | Tipo de beneficiário | Number | SIM |
| formaDoacao | Forma de Doação | Number | SIM |
| valor | Valor | Number | SIM |

Objeto naoOptante:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| administracaoTributaria | Administração tributária onde foi protocolado, com 1 dígito. | Number | SIM |
| uf | UF | String (2) | SIM |
| codigoMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| numeroProcesso | Número do processo | String (20) | SIM |

Objeto estabelecimento:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cnpjCompleto | CNPJ completo do estabelecimento (somente números) | String (14) | SIM |
| estoqueInicial | Estoque Inicial do período abrangido pela declaração - este campo será preenchido exclusivamente pelos contribuintes do ICMS, os demais devem informar 0 | Number | SIM |
| estoqueFinal | Estoque Final do período abrangido pela declaração - este campo será preenchido exclusivamente pelos contribuintes do ICMS, os demais devem informar 0 | Number | SIM |
| saldoCaixaInicial | Saldo em caixa/banco no início do período abrangido pela declaração | Number | SIM |
| saldoCaixaFinal | Saldo em caixa/banco no final do período abrangido pela declaração | Number | SIM |
| aquisicoesMercadoInterno | Aquisições de mercadorias para comercialização ou industrialização no período abrangido pela declaração - Mercado interno | Number | SIM |
| importacoes | Aquisições de mercadorias para comercialização ou industrialização no período abrangido pela declaração - importacoes | Number | SIM |
| totalEntradasPorTransferencia | Total de entradas de mercadorias por transferência para comercialização ou industrialização no período abrangido pela declaração | Number | SIM |
| totalSaidasPorTransferencia | Total de saídas de mercadorias por transferência para comercialização ou industrialização no período abrangido pela declaração | Number | SIM |
| totalDevolucoesVendas | Total de devoluções de vendas de mercadorias para comercialização ou industrialização no período abrangido pela declaração | Number | SIM |
| totalEntradas | Total de entradas (incluídos itens aquisicoesMercadoInterno, totalEntradasPorTransferencia e totalDevolucoesVendas) no período abrangido pela declaração | Number | SIM |
| totalDevolucoesCompras | Total de devoluções de compras de mercadorias para comercialização ou industrialização no período abrangido pela declaração | Number | SIM |
| totalDespesas | Total de despesas no período abrangido pela declaração | Number | SIM |
| operacoesInterestaduais | Lista de operações interestaduais por UF. | Array de Object operacaoInterestadual | NÃO |
| issRetidosFonte | Valor de ISS retido na fonte no ano-calendário, por Município. | Array de Object issRetidoFonte | NÃO |
| prestacoesServicoComunicacao | Prestação de serviços de comunicação. | Array de Object prestacaoServicoComunicacao | NÃO |
| mudancaOutroMunicipio | Se houve mudança de endereço do estabelecimento para outro município no período abrangido pela declaração, inserir neste objeto. Um por mudança. | Array de Object mudancaOutroMunicipio | NÃO |
| prestacoesServicoTransporte | Informações sobre prestação de serviços de transporte de cargas interestadual e/ou intermunicipal, e de transporte intermunicipal e interestadual de passageiros autorizados no inciso VI do art. 17 da LC 123, com e sem substituição tributária. | Array de Object prestacaoServicoTransporte | NÃO |
| informacaoOpcional | Informações opcionais sobre o estabelecimento. Ver regra e informacaoOpcional | Object | NÃO |

Objeto operacaoInterestadual:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| valor | Valor | Number | SIM |
| tipoOperacao | Tipo de operação com 1 dígito. | Number | SIM |

Objeto issRetidoFonte:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |

Objeto prestacaoServicoComunicacao:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |

Objeto mudancaOutroMunicipio:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| ufOrigem | UF de origem | String (2) | SIM |
| codigoMunicipioOrigem | Código do município de origem | String (4) | SIM |
| ufDestino | UF de destino | String (2) | SIM |
| codigoMunicipioDestino | Código do município de origem | String (4) | SIM |
| dataMudanca | Data da mudança no formato AAAAMMDD | Number | SIM |
| informacaoOpcional | Informações opcionais sobre a mudança no destino. Ver regra e informacaoOpcional | Object | NÃO |

Objeto informacaoOpcional:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| saidaTransferenciaMercadoria | Saídas por transferência de mercadorias entre estabelecimentos do mesmo proprietário | Number | NÃO |
| vendasRevendedorAmbulante | Vendas por meio de revendedores ambulantes autônomos em outros Municípios dentro do Estado em que esteja localizado o estabelecimento. | Array de Object vendaRevendedorAmbulante | NÃO |
| preparosComercializacaoRefeicoes | Preparo e comercialização de refeições em municípios diferentes do Município de localização do estabelecimento. | Array de Object preparoRefeicao | NÃO |
| producoesRurais | Produção rural ocorrida no território de mais de um Município do Estado em que esteja localizado o estabelecimento. | Array de Object producaoRural | NÃO |
| aquisicoesProdutoresRurais | Aquisição de mercadorias de produtores rurais não equiparados a comerciantes ou a industriais. | Array de Object aquisicaoProdutorRural | NÃO |
| aquisicoesDispensadosInscricao | Aquisição de mercadorias de contribuintes dispensados de inscrição, exceto produtor rural. | Array de Object aquisicaoDispensadoInscricao | NÃO |
| autoInfracaoPago | Autos de infração pagos ou com decisão administrativa irrecorrível decorrentes de saídas de mercadorias ou prestações de serviço não oferecidas à tributação, somente o valor da operação | Number | NÃO |
| rateiosReceitaRegimeEspecial | Rateio de Receita oriundo de regime especial concedido pela Secretaria Estadual de Fazenda (SEFAZ). | Array de Object rateioRegimeEspecial | NÃO |
| rateiosDecisaoJudicial | Rateio de Receita oriundo de decisão judicial. | Array de Object rateioDecisaoJudicial | NÃO |
| rateiosReceitaOutrosRateios | Rateio de Receita oriundo de outros rateios determinados pela SEFAZ (excluindo regime especial e decisão judicial). | Array de Object rateioOutrosRateios | NÃO |

Objeto vendaRevendedorAmbulante:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |

Objeto preparoComercializacaoRefeicao:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |

Objeto producaoRural:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |

Objeto aquisicaoProdutorRural:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |

Objeto aquisicaoDispensado:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |

Objeto rateioRegimeEspecial:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |
| numeroRegime | Número do Regime | String | SIM |

Objeto rateioDecisaoJudicial:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |
| identificacaoDecisao | Identificação da decisão | String | SIM |

Objeto rateioOutrosRateios:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |
| origemExigencia | Origem da exigência | String | SIM |

Objeto prestacaoServicoTransporte:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| uf | UF | String (2) | SIM |
| codMunicipio | Código do município de acordo com a tabela TOM | String (4) | SIM |
| valor | Valor | Number | SIM |

Regras

**a)** Qualquer declaração anterior que estiver pendente de transmissão no ano calendário será apagada. **b)** No caso de qualquer erro encontrado, nenhum dado será salvo.

Schema do Json

**[Schema](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/schema.json)** de entrada.

**Exemplo: conteúdo body json de entrada**

```text
{
"Contratante": {
"numero": "00000000000000",
"tipo": 2
},
"AutorPedidoDados": {
"Numero": "00000000000000",
"Tipo": 2
},
"Contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"PedidoDados": {
"IdSistema": "DEFIS",
"IdServico": "TRANSDECLARACAO141",
"Dados": "{\"ano\":2021,\"situacaoEspecial\":null,\"inatividade\":\"empresa\":{\"ganhoCapital\":10.0,\"qtdEmpregadoInicial\":2\"qtdEmpregadoFinal\":0,\"lucroContabil\":20.\"receitaExportacaoDireta\":10.0,\"comerciaisExportadoras\[{\"cnpjCompleto\":\"00000000000000\",\"valor\":123.0}],\"socios\[{\"cpf\":\"00000000000\",\"rendimentosIsentos\":50.\"rendimentosTributaveis\":20.0,\"participacaoCapitalSocial\":90.\"irRetidoFonte\":10.0}],\"participacaoCotasTesouraria\":10.\"ganhoRendaVariavel\":10.0,\"doacoesCampanhaEleitoral\[{\"cnpjBeneficiario\":\"00000000000000\",\"tipoBeneficiario\":\"formaDoacao\":1,\"valor\":10.0}],\"estabelecimentos\[{\"cnpjCompleto\":\"00000000000000\",\"totalDevolucoesCompras\":200.\"OperacoesInterestaduais\":[{\"Uf\":\"SP\",\"Valor\":15.\"TipoOperacao\":1}],\"IssRetidosFonte\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"PrestacaoServicosComunicacao\[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}\"MudancasOutroMunicipio\":[],\"PrestacoesServicoTransporte\[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}\"InformacaoOpcional\":{\"vendasRevendedorAmbulante\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0}\"preparosComercializacaoRefeicoes\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"producoesRurais\[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}\"aquisicoesProdutoresRurais\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":710\"Valor\":20.0}],\"aquisicoesDispensadosInscricao\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"rateiosReceitaRegimeEspecial\[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.\"numeroRegime\":\"999999\"}],\"rateiosDecisaoJudicial\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0,\"identificacaoDecisao\":\"teste\"}\"rateiosReceitaOutrosRateios\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":710\"Valor\":20.0,\"origemExigencia\":\"teste\"}\"saidaTransferenciaMercadoria\":20.0,\"autoInfracaoPago\":20.0\"estoqueInicial\":10.0,\"estoqueFinal\":20.0,\"saldoCaixaInicial\":-100.\"saldoCaixaFinal\":-50.0,\"aquisicoesMercadoInterno\":20.\"importacoes\":50.0,\"totalEntradasPorTransferencia\":200.\"totalSaidasPorTransferencia\":200.0,\"totalDevolucoesVendas\":300.\"totalEntradas\":5000.0,\"totalDespesas\":10000.0}]},\"naoOptante\":null}"
}
}
```
