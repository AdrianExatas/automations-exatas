---
key: "DEFIS.TRANSDECLARACAO141"
family: "integra-sn"
systemId: "DEFIS"
serviceId: "TRANSDECLARACAO141"
version: "1.0"
operationPath: "Declarar"
sourceStatus: "fetched"
---

# Transmitir a Declaração Sócio Econômica - DEFIS

Transmissão da declaração das informações socioeconômicas e fiscais (DEFIS).

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `DEFIS.TRANSDECLARACAO141` |
| Família | `integra-sn` |
| Caminho físico | `POST /Declarar` |
| Versão | `1.0` |
| Situação oficial | 25/09/2023 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00146) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | ano | Number | SIM | — | Ano calendário |
| Dados de Entrada — Objeto Dados: | situacaoEspecial | Object | NÃO | — | Informações de situacaoEspecial |
| Dados de Entrada — Objeto Dados: | inatividade | Number | SIM (somente para AC anterior a 2025) | — | Resposta à pergunta sobre inatividade. Ver Regra . |
| Dados de Entrada — Objeto Dados: | empresa | Object | SIM | — | Informações da matriz. Ver empresa . |
| Dados de Entrada — Objeto situacaoEspecial: | tipoEvento | Number | SIM | — | Tipo do evento com 1 dígito. |
| Dados de Entrada — Objeto situacaoEspecial: | dataEvento | Number | SIM | — | Data do evento da situação especial no formato AAAAMMDD. |
| Dados de Entrada — Objeto empresa: | ganhoCapital | Number | SIM | — | Ganhos de capital |
| Dados de Entrada — Objeto empresa: | qtdEmpregadoInicial | Number | SIM | — | Quantidade de empregados no ínicio do Ano Calendário |
| Dados de Entrada — Objeto empresa: | qtdEmpregadoFinal | Number | SIM | — | Quantidade de empregados no final do Ano Calendário |
| Dados de Entrada — Objeto empresa: | lucroContabil | Number | NÃO | — | Caso a ME/EPP mantenha escrituração contábil e tenha evidenciado lucro superior ao limite de que trata o § 1º do art. 131 da Resolução CGSN nº 94, de 29/11/2011, no período abrangido por esta declaração, informe o valor do lucro contábil apurado |
| Dados de Entrada — Objeto empresa: | receitaExportacaoDireta | Number | SIM | — | Receita proveniente de exportação direta |
| Dados de Entrada — Objeto empresa: | comerciaisExportadoras | Array de Object comercialExportadora | NÃO | — | Receitas provenientes de exportação por meio de comercial exportadora. |
| Dados de Entrada — Objeto empresa: | socios | Array de Object socio | SIM | — | Identificação e rendimentos dos sócios. |
| Dados de Entrada — Objeto empresa: | participacaoCotasTesouraria | Number | NÃO | — | Percentual de participação em cotas em tesouraria no capital social da empresa |
| Dados de Entrada — Objeto empresa: | ganhoRendaVariavel | Number | SIM | — | Total de ganhos líquidos auferidos em operações de renda variável |
| Dados de Entrada — Objeto empresa: | doacoesCampanhaEleitoral | Array de Object doacao | NÃO | — | Doações à Campanha Eleitoral. |
| Dados de Entrada — Objeto empresa: | estabelecimentos | Array de Object estabelecimento | SIM | — | Lista de estabelecimentos. |
| Dados de Entrada — Objeto empresa: | naoOptante | Object | NÃO | — | Informação de não optante. Ver naoOptante |
| Dados de Entrada — Objeto comercialExportadora: | cnpjCompleto | String (14) | SIM | — | CNPJ completo |
| Dados de Entrada — Objeto comercialExportadora: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto socio: | cpf | String (11) | SIM | — | CPF do sócio - somente números |
| Dados de Entrada — Objeto socio: | rendimentosIsentos | Number | SIM | — | Rendimentos isentos pagos ao sócio pela empresa |
| Dados de Entrada — Objeto socio: | rendimentosTributaveis | Number | SIM | — | Rendimentos tributáveis pagos ao sócio pela empresa |
| Dados de Entrada — Objeto socio: | participacaoCapitalSocial | Number | SIM | — | Percentual de participação do sócio no capital social da empresa no último dia do período abrangido pela declaração |
| Dados de Entrada — Objeto socio: | irRetidoFonte | Number | SIM | — | Imposto de renda retido na fonte sobre os rendimentos pagos ao sócio pela ME/EPP |
| Dados de Entrada — Objeto doacao: | cnpjBeneficiario | String (14) | SIM | — | CNPJ beneficiário |
| Dados de Entrada — Objeto doacao: | tipoBeneficiario | Number | SIM | — | Tipo de beneficiário |
| Dados de Entrada — Objeto doacao: | formaDoacao | Number | SIM | — | Forma de Doação |
| Dados de Entrada — Objeto doacao: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto naoOptante: | administracaoTributaria | Number | SIM | — | Administração tributária onde foi protocolado, com 1 dígito. |
| Dados de Entrada — Objeto naoOptante: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto naoOptante: | codigoMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto naoOptante: | numeroProcesso | String (20) | SIM | — | Número do processo |
| Dados de Entrada — Objeto estabelecimento: | cnpjCompleto | String (14) | SIM | — | CNPJ completo do estabelecimento (somente números) |
| Dados de Entrada — Objeto estabelecimento: | estoqueInicial | Number | SIM | — | Estoque Inicial do período abrangido pela declaração - este campo será preenchido exclusivamente pelos contribuintes do ICMS, os demais devem informar 0 |
| Dados de Entrada — Objeto estabelecimento: | estoqueFinal | Number | SIM | — | Estoque Final do período abrangido pela declaração - este campo será preenchido exclusivamente pelos contribuintes do ICMS, os demais devem informar 0 |
| Dados de Entrada — Objeto estabelecimento: | saldoCaixaInicial | Number | SIM | — | Saldo em caixa/banco no início do período abrangido pela declaração |
| Dados de Entrada — Objeto estabelecimento: | saldoCaixaFinal | Number | SIM | — | Saldo em caixa/banco no final do período abrangido pela declaração |
| Dados de Entrada — Objeto estabelecimento: | aquisicoesMercadoInterno | Number | SIM | — | Aquisições de mercadorias para comercialização ou industrialização no período abrangido pela declaração - Mercado interno |
| Dados de Entrada — Objeto estabelecimento: | importacoes | Number | SIM | — | Aquisições de mercadorias para comercialização ou industrialização no período abrangido pela declaração - importacoes |
| Dados de Entrada — Objeto estabelecimento: | totalEntradasPorTransferencia | Number | SIM | — | Total de entradas de mercadorias por transferência para comercialização ou industrialização no período abrangido pela declaração |
| Dados de Entrada — Objeto estabelecimento: | totalSaidasPorTransferencia | Number | SIM | — | Total de saídas de mercadorias por transferência para comercialização ou industrialização no período abrangido pela declaração |
| Dados de Entrada — Objeto estabelecimento: | totalDevolucoesVendas | Number | SIM | — | Total de devoluções de vendas de mercadorias para comercialização ou industrialização no período abrangido pela declaração |
| Dados de Entrada — Objeto estabelecimento: | totalEntradas | Number | SIM | — | Total de entradas (incluídos itens aquisicoesMercadoInterno, totalEntradasPorTransferencia e totalDevolucoesVendas) no período abrangido pela declaração |
| Dados de Entrada — Objeto estabelecimento: | totalDevolucoesCompras | Number | SIM | — | Total de devoluções de compras de mercadorias para comercialização ou industrialização no período abrangido pela declaração |
| Dados de Entrada — Objeto estabelecimento: | totalDespesas | Number | SIM | — | Total de despesas no período abrangido pela declaração |
| Dados de Entrada — Objeto estabelecimento: | operacoesInterestaduais | Array de Object operacaoInterestadual | NÃO | — | Lista de operações interestaduais por UF. |
| Dados de Entrada — Objeto estabelecimento: | issRetidosFonte | Array de Object issRetidoFonte | NÃO | — | Valor de ISS retido na fonte no ano-calendário, por Município. |
| Dados de Entrada — Objeto estabelecimento: | prestacoesServicoComunicacao | Array de Object prestacaoServicoComunicacao | NÃO | — | Prestação de serviços de comunicação. |
| Dados de Entrada — Objeto estabelecimento: | mudancaOutroMunicipio | Array de Object mudancaOutroMunicipio | NÃO | — | Se houve mudança de endereço do estabelecimento para outro município no período abrangido pela declaração, inserir neste objeto. Um por mudança. |
| Dados de Entrada — Objeto estabelecimento: | prestacoesServicoTransporte | Array de Object prestacaoServicoTransporte | NÃO | — | Informações sobre prestação de serviços de transporte de cargas interestadual e/ou intermunicipal, e de transporte intermunicipal e interestadual de passageiros autorizados no inciso VI do art. 17 da LC 123, com e sem substituição tributária. |
| Dados de Entrada — Objeto estabelecimento: | informacaoOpcional | Object | NÃO | — | Informações opcionais sobre o estabelecimento. Ver regra e informacaoOpcional |
| Dados de Entrada — Objeto operacaoInterestadual: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto operacaoInterestadual: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto operacaoInterestadual: | tipoOperacao | Number | SIM | — | Tipo de operação com 1 dígito. |
| Dados de Entrada — Objeto issRetidoFonte: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto issRetidoFonte: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto issRetidoFonte: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto prestacaoServicoComunicacao: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto prestacaoServicoComunicacao: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto prestacaoServicoComunicacao: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto mudancaOutroMunicipio: | ufOrigem | String (2) | SIM | — | UF de origem |
| Dados de Entrada — Objeto mudancaOutroMunicipio: | codigoMunicipioOrigem | String (4) | SIM | — | Código do município de origem |
| Dados de Entrada — Objeto mudancaOutroMunicipio: | ufDestino | String (2) | SIM | — | UF de destino |
| Dados de Entrada — Objeto mudancaOutroMunicipio: | codigoMunicipioDestino | String (4) | SIM | — | Código do município de origem |
| Dados de Entrada — Objeto mudancaOutroMunicipio: | dataMudanca | Number | SIM | — | Data da mudança no formato AAAAMMDD |
| Dados de Entrada — Objeto mudancaOutroMunicipio: | informacaoOpcional | Object | NÃO | — | Informações opcionais sobre a mudança no destino. Ver regra e informacaoOpcional |
| Dados de Entrada — Objeto informacaoOpcional: | saidaTransferenciaMercadoria | Number | NÃO | — | Saídas por transferência de mercadorias entre estabelecimentos do mesmo proprietário |
| Dados de Entrada — Objeto informacaoOpcional: | vendasRevendedorAmbulante | Array de Object vendaRevendedorAmbulante | NÃO | — | Vendas por meio de revendedores ambulantes autônomos em outros Municípios dentro do Estado em que esteja localizado o estabelecimento. |
| Dados de Entrada — Objeto informacaoOpcional: | preparosComercializacaoRefeicoes | Array de Object preparoRefeicao | NÃO | — | Preparo e comercialização de refeições em municípios diferentes do Município de localização do estabelecimento. |
| Dados de Entrada — Objeto informacaoOpcional: | producoesRurais | Array de Object producaoRural | NÃO | — | Produção rural ocorrida no território de mais de um Município do Estado em que esteja localizado o estabelecimento. |
| Dados de Entrada — Objeto informacaoOpcional: | aquisicoesProdutoresRurais | Array de Object aquisicaoProdutorRural | NÃO | — | Aquisição de mercadorias de produtores rurais não equiparados a comerciantes ou a industriais. |
| Dados de Entrada — Objeto informacaoOpcional: | aquisicoesDispensadosInscricao | Array de Object aquisicaoDispensadoInscricao | NÃO | — | Aquisição de mercadorias de contribuintes dispensados de inscrição, exceto produtor rural. |
| Dados de Entrada — Objeto informacaoOpcional: | autoInfracaoPago | Number | NÃO | — | Autos de infração pagos ou com decisão administrativa irrecorrível decorrentes de saídas de mercadorias ou prestações de serviço não oferecidas à tributação, somente o valor da operação |
| Dados de Entrada — Objeto informacaoOpcional: | rateiosReceitaRegimeEspecial | Array de Object rateioRegimeEspecial | NÃO | — | Rateio de Receita oriundo de regime especial concedido pela Secretaria Estadual de Fazenda (SEFAZ). |
| Dados de Entrada — Objeto informacaoOpcional: | rateiosDecisaoJudicial | Array de Object rateioDecisaoJudicial | NÃO | — | Rateio de Receita oriundo de decisão judicial. |
| Dados de Entrada — Objeto informacaoOpcional: | rateiosReceitaOutrosRateios | Array de Object rateioOutrosRateios | NÃO | — | Rateio de Receita oriundo de outros rateios determinados pela SEFAZ (excluindo regime especial e decisão judicial). |
| Dados de Entrada — Objeto vendaRevendedorAmbulante: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto vendaRevendedorAmbulante: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto vendaRevendedorAmbulante: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto preparoComercializacaoRefeicao: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto preparoComercializacaoRefeicao: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto preparoComercializacaoRefeicao: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto producaoRural: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto producaoRural: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto producaoRural: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto aquisicaoProdutorRural: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto aquisicaoProdutorRural: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto aquisicaoProdutorRural: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto aquisicaoDispensado: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto aquisicaoDispensado: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto aquisicaoDispensado: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto rateioRegimeEspecial: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto rateioRegimeEspecial: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto rateioRegimeEspecial: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto rateioRegimeEspecial: | numeroRegime | String | SIM | — | Número do Regime |
| Dados de Entrada — Objeto rateioDecisaoJudicial: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto rateioDecisaoJudicial: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto rateioDecisaoJudicial: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto rateioDecisaoJudicial: | identificacaoDecisao | String | SIM | — | Identificação da decisão |
| Dados de Entrada — Objeto rateioOutrosRateios: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto rateioOutrosRateios: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto rateioOutrosRateios: | valor | Number | SIM | — | Valor |
| Dados de Entrada — Objeto rateioOutrosRateios: | origemExigencia | String | SIM | — | Origem da exigência |
| Dados de Entrada — Objeto prestacaoServicoTransporte: | uf | String (2) | SIM | — | UF |
| Dados de Entrada — Objeto prestacaoServicoTransporte: | codMunicipio | String (4) | SIM | — | Código do município de acordo com a tabela TOM |
| Dados de Entrada — Objeto prestacaoServicoTransporte: | valor | Number | SIM | — | Valor |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um Array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: SaidaEntregar | declaracaoPdf | String | — | — | PDF da Declaração, em base 64. |
| Dados de Saída — Objeto: SaidaEntregar | reciboPdf | String | — | — | PDF do Recibo, em base 64. |
| Dados de Saída — Objeto: SaidaEntregar | idDefis | String (15) | — | — | Id da Defis gerada na transmissão. |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

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

### Exemplo 2 — response

Fonte oficial:

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
        "idSistema": "DEFIS",
        "idServico": "TRANSDECLARACAO141",
        "versaoSistema": "1.0",
        "dados": "{ \"ano\":2021,\"situacaoEspecial\":null,\"inatividade\":\"empresa\":{\"ganhoCapital\":10.0,\"qtdEmpregadoInicial\":2\"qtdEmpregadoFinal\":0,\"lucroContabil\":20.\"receitaExportacaoDireta\":10.0,\"comerciaisExportadoras\[{\"cnpjCompleto\":\"00000000000000\",\"valor\":123.0}],\"socios\[{\"cpf\":\"00000000000\",\"rendimentosIsentos\":50.\"rendimentosTributaveis\":20.0,\"participacaoCapitalSocial\":90.\"irRetidoFonte\":10.0}],\"participacaoCotasTesouraria\":10.\"ganhoRendaVariavel\":10.0,\"doacoesCampanhaEleitoral\[{\"cnpjBeneficiario\":\"00000000000000\",\"tipoBeneficiario\":\"formaDoacao\":1,\"valor\":10.0}],\"estabelecimentos\[{\"cnpjCompleto\":\"00000000000000\",\"totalDevolucoesCompras\":200.\"OperacoesInterestaduais\":[{\"Uf\":\"SP\",\"Valor\":15.\"TipoOperacao\":1}],\"IssRetidosFonte\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0}\"PrestacaoServicosComunicacao\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"MudancasOutroMunicipio\":[\"PrestacoesServicoTransporte\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":710\"Valor\":20.0}],\"InformacaoOpcional\":{\"vendasRevendedorAmbulante\[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}\"preparosComercializacaoRefeicoes\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0}],\"producoesRurais\[{\"Uf\":\"SP\",\"CodigoMunicipio\":7107,\"Valor\":20.0}\"aquisicoesProdutoresRurais\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":710\"Valor\":20.0}],\"aquisicoesDispensadosInscricao\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0}\"rateiosReceitaRegimeEspecial\":[{\"Uf\":\"SP\\"CodigoMunicipio\":7107,\"Valor\":20.0,\"numeroRegime\":\"999999\"}\"rateiosDecisaoJudicial\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":710\"Valor\":20.0,\"identificacaoDecisao\":\"teste\"}\"rateiosReceitaOutrosRateios\":[{\"Uf\":\"SP\",\"CodigoMunicipio\":710\"Valor\":20.0,\"origemExigencia\":\"teste\"}\"saidaTransferenciaMercadoria\":20.0,\"autoInfracaoPago\":20.0\"estoqueInicial\":10.0,\"estoqueFinal\":20.0,\"saldoCaixaInicial\":-100,\"saldoCaixaFinal\":-50.0,\"aquisicoesMercadoInterno\":20.\"importacoes\":50.0,\"totalEntradasPorTransferencia\":200.\"totalSaidasPorTransferencia\":200.0,\"totalDevolucoesVendas\":300.\"totalEntradas\":5000.0,\"totalDespesas\":10000.0}]\"naoOptante\":null}"
    },
    "status": 200,
    "mensagens": [
    {
      "codigo": "[Sucesso-DEFIS]",
      "texto": "Requisição efetuada com sucesso."
    }
    ],
     "dados": "{\"declaracaoPdf\":\"<BASE64_REMOVIDO_TAMANHO_24564>\",\"reciboPdf\":\"JVBERi0xLjUKJafj8fEKMiAwIG9iago8PAovUGFnZXMgNCAwIFIKL1R5cGUgL0NhdGFsb2cKL0Fjcm9Gb3JtIDUgMCBSCi9WZXJzaW9uIC8xIzJFNQo+PgplbmRvYmoKOCAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDEwCj4+CnN0cmVhbQ0KeJwr5AIAAO4AfA0KZW5kc3RyZWFtCmVuZG9iago5IDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMTAKPj4Kc3RyZWFtDQp4nCvkAgAA7gB8DQplbmRzdHJlYW0KZW5kb2JqCjEwIDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMTAKPj4Kc3RyZWFtDQp4nCvkAgAA7gB8DQplbmRzdHJlYW0KZW5kb2JqCjExIDAgb2JqCjw8Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMTA0Mgo+PgpzdHJlYW0NCnicvVbLbts6EN3rK7hUFrY5fEpFUUC1JadB4zSNV0U3uqluros4ThwXBfr1nSEpOY6oJM0FikQ2aR7OHB7Ng3cJsJ+J5kxbM9ZM5fgItm2Si+Qu4ewEn+8Owtk8EbllBjLErd1Y5xbH14g9H0B7REA7Dx496LRdkOpFbLyBYF\/r59g4REA7D4dsek7Dgsq7Bf7CBf14oc9IK49RjlOYZeqJMwSMPdhheufoOw8LktuwAMIM09JM5oIccDcYZoNAxHggPgckIr7IyF0CSIr+pGRGIMRayy7XyWS1vuJstkEU4d4vyUgGgi2\/JQTvfQk2kpoG3iAORvuRaKEeEn4Gq8e4TbjJpAJG5v9N3ipltJFmasAKA6UtpakEN\/ir4Co3pTGmwpUZrVXaaCsF14jBPTl+0t7KlJVCRI5joHWj37Hld+TkfHrGNh8bNoKMJmm1ur+sV\/df01lZfbj4enTk4B7Tks\/890gNy6C4RJPWn0gw4P5E2mbIUxhZzjxLWQguhaRHeGa0M1jy+9GRABpIG7UJqATqovCEqJXGmSpJsUPr4K2TjfgxIAP3FmCsu\/cgyUP6uZx+eH\/GZiUrF8vP5bzwmvgNwZiR4\/BKR8b6IVgqSRHCCjNBqqkCLRRM7VQqpI9jjamTY+LkuAqIqmi9fV1kK\/hyyeh9ZZkfSh11pTmpjVpXGDUUO2AExRJqZFEf95tFDMUYKhiJN1IwKKf3DIDrHgWh8occIHBIOUzwX3B8hzWTMAHhJiGu3KaIVeB5MNs\/FprGv+1Vko6dFc6uHqQW5vXeiuRjPRijos\/2rQRRDmeXV0y5vLLKxZiwGj9x1maWGIje5yi0p0sXm3XDmvXttrmvt6v6+ihulkdE72xMF59O2Leanda77epXTOtDchEp0vnx4qRg8+Pz4+LLcs7OP54Wy8XyzE3mky9sUZ5+fMStS6lgNR4Sh0xeUk1iMs3qXU1HLP5ptrsf25rdbBgd+zVynd3u6ptdw26b6w27WK1vr5t7tqgvV5ubTv8\/VE\/kE24mkOfqVRqlyCLi+CVijYiOfFQJqMBgdlPWz6h\/hC4Cllu9z3YXwXvpZJeMQ3ZjqdjtF+1+0dsPe14um2ZUhawqC8w76gtwyES2luTrmKh2v4ro9bRsWItLzVXhJHMtVBkkOCWSJnctl6OAWB6o9VAZcJiSvnE2UFb\/utApWzQ3\/\/1Y10d\/XdhomRXPlFkIAYuqWv7g6vOUnq8uvbBvzWjUOXHZkRG19i7R0VK+g+ILn1EAWPn\/yMVqGxcTnlGblAzgjRBvwAxVEV8Ioocpq4KSHYlUbesKmmLb6tHSeXt\/kQO09tiMt81fDXrHGyZlg8sJd\/2Mi8Ghi\/2hfv+wt4sWjbd3HJVLvJb\/Bimt8gsNCmVuZHN0cmVhbQplbmRvYmoKMTIgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCA4NAo+PgpzdHJlYW0NCnicC+RyCuEyUAgp4tJ3SS3LTE4NcndSSC4GCoFgcTKXvpuxgiFQQRqXIVjIUMHYwEDB1MJQISSXS8PAQM8AgvWB2EDXwEBTISQLYqBrCBcA7uMUJQ0KZW5kc3RyZWFtCmVuZG9iagoxMyAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDc0Cj4+CnN0cmVhbQ0KeJwL5HIK4TJQCCni0ndJLctMTg1yd1JILgYKgWBxMpe+m4mCIVBBGpchWMhQwdRIwdjURCEkl0vDAB1oKoRkQYxzDeECAMjfE9ANCmVuZHN0cmVhbQplbmRvYmoKMTQgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCA3Ngo+PgpzdHJlYW0NCnicC+RyCuEyUAgp4tJ3SS3LTE4NcndSSC4GCoFgcTKXvpuJgiFQQRqXIVjIUMHUSMHY0EghJJdLwwAE9DBITYWQLIihriFcAD\<BASE64_REMOVIDO_TAMANHO_2375>\/duZevuW113d3ff+zfsnXnvhRcCLefsye4P+z0n783ce+fNZ3yCiHFTUNTiSwc\/zsb\/UB6HJoipyCgAKBuuFbMDX\/7XWf4MEhOj64BrluSx3sWeumAvW1vbGE8KeGzL5LWbmT1ue\/HMNhXiYJ7kCh7Ci06olHyiQmJs5UppFqyR6Yetg5a72DbwbGlTjhju7CawLGQZP3VcUlpxKaXUXcyoT6IqBT8UepD5rJgpVqBqHXSraOhW8q6XfJLswFThzOj4rpS1\/7KW8jMhWoqvj+V2t8RDOfcW+BvsAyCGsZQwo7tzN4vybTKniJkxxDLWpJqXriAelHxGlgBTFlbpG24yAxudQPjdWKDh+ntnyuQlrjIWBw5OLAMk83oybxLTVsTiZFpPFrVY8hlZlGb9MrpAaJloCcaGIggdIZs9WudtK\/LdpRKGqb2y7KC4jJ4sek3QPKHxE2v7YtEXRllxjXkf8WtmcT1ut6acBw\/FlfR82GM2e0w\/P1KsqaNXlvF+OEnqXyOL8hjq1vAavTP7YrHfqhClQz8+sl15VMMRlvpBe43RPoNmur6Qf+25Xlncp+Jb9PL1NmGJp2LjeOvv9sVSFiJr8XihXd+1+1Sm\/7xlcAOuYvnqyeYweTuYZ6MZi7+Sj204PTe7mrDQNjX6JO+Xir5YAhIHcR2NodW+T2xZQEnaTbZgMYpnm7aXmtPUA5\/uPVhGbqbHAWSNCr8vZ\/HdbxPNuwXyk586d\/3JM3dYd9596VlEaWvwP33CDOYeQIsZS9AteizLpuld9rpJv3Qr8unriHsGTJRZYr8SxojLsO+vPFOWSIAac5ZvaJbcmUWpwg\/ce2VJxaezFHDPp6\/IdpgoRaIsQB+6qnHN1G4WWrc3zVjKFXtoPNiu+DB7Zy8shmifvlnclp6yZsrd6CeYq2YFGjtnwAvQQ8OWd0\/kZ2GIGctvZBXk6KyUs\/imrXBxsVkpnPMii7YHi71sKwuZ3v7t4OBaXH1uuLCfhc2ONYxziljyKPxG2BGpZcYl3lLsZ8aiQVuxm1VVJizK6bLhFVjG4RNYGt0D9AAXWDKMRzfinFSteJrOkbpmiRQe7YK9sLQKg2yNU0xZ7MxYhu244MKVgvGcxd1uoChP\/JyHLIqj6Ns8uQVTyqXy1ySWQMmSntkbSzI\/LOEj4ftPYjFqFA4RdmSDq6gIbE3grrVtmW0\/8RrmoudQ6SqVtEgsmSV90RN7Y8Eg\/tldQr\/3i0UjsnRrhg5rxKSv8LpBxXY1Sx+YFMFdh7UolznLdva+s\/gfsTip0G+J3JDKLkWoM35Bt3uDTdZdNJWngcfSXaqDvV9EzBSZ2tnbgViseMQkWaGVPceo510qiiapz5vGbFG9Cvsh7SAbUpYacStLXCS6dHrT5jo7jN6VOtRVMkeNfKeMtzHRelwdZmqJ4WG7azpHOo1dm7a9qj8klpeqXz3yv5bCQqLF6BGiQm0IJdR8c0iuTab5yk6r0tU0Lmof1NGPomhz91HTCoqxspACkzE9NELR0jUIL\/mXOKLKq9h3z49xhfkev3YW7Rxb0e5Q\/WFzyVqVelToI5xSUH0McSNYSPfVOBxgQyckYhq7WJ+HOtqGOpR\/KOZDfigsaKNr2Rb6L3aOToa4TwBaEW0sxeKgRhc6kdZBGIbq7eviAsFGdTk4XlnQqmzyPGEo2kCb3zzvMQRcBo7x4GZncRZSVgVYXwVHJ3aPx+8T3jkOJxEz3E6zyw+cWbzHPxd+eQBu2ZZmWUZH3NFGsFfCfA105i0rbDNUNycoM1+b6Oqld9hLx9Kr3t4B4N+R4BtsN3eapVjqPPEW5HgB5GTAnHnQRRU9DxmTIfbKKdArYVokhFY0QdR82BwRC6nszF5wMdfaIspdocUUzUzdZ5rELw6gYrmmamZEfviIgeWpODtnxqh63QPNJnys2b9paRJe3uuSqwkMbPkbL0TAtQ0KZW5kc3RyZWFtCmVuZG9iagoxIDAgb2JqCjw8Ci9UeXBlIC9PYmpTdG0KL04gMTIKL0ZpcnN0IDc3Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggMjMgMCBSCj4+CnN0cmVhbQ0KeJzNUU1LAzEQ\/SsPPNgimmSS\/RIRbNeCSLG0BYV2D9vdUCK6kd0t1H9vstt6qCB485KXmcy8vJknwaEgeIgAQimEEGGMCJS4OIDk3CUgowgigiKCiKFkApEgEArEESQhSCCMYtzcsHGt89bYKs1bjUF6TZwkjzkJQaTokstzzs+HbFbbclfoGgN5xa8I60HgMFgPMWRTW\/7ojgMS0QWnrvv21v+0\/PzQYLN8qxv2aMoGq9DNMs\/Y2O6qFqKvmhj95t8yls7dWK7gtJtNdWnykd1jxeHHCRArytxbrR2P8j2Os2pd5IhiHyPpTsF7ED1QD7IH1auZ68bu6kI3fp3H7w\/arNfZqfYLKRa6xYrN0gnYUu9bsId3p290wPEBHzL28rR51UXrLfkeaNJZ46kmwrvT3aQ3qLsp79F3sXnfchCdrsMLYovdpu0inxNslDe6E+r3Whtds\/uqsKWptmDPprqrGnNM\/JnqjNKRfSv\/NeOvVF\/xaunBDQplbmRzdHJlYW0KZW5kb2JqCjIzIDAgb2JqCjM3NQplbmRvYmoKMjQgMCBvYmoKPDwKL1NpemUgMjUKL0luZm8gMyAwIFIKL0lEIFs8OEEyQTIwOENFQ0I2QkVEODczODAxQjNEMjU2NjJCNTc+IDw4QTJBMjA4Q0VDQjZCRUQ4NzM4MDFCM0QyNTY2MkI1Nz5dCi9Sb290IDIgMCBSCi9UeXBlIC9YUmVmCi9JbmRleCBbMCAyNV0KL1cgWzEgMiAyXQovREwgMTI1Ci9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9MZW5ndGggODMKPj4Kc3RyZWFtDQp4nCXLqxGAMBRE0X2BJPxmMAwaTUEIFKXQE4aaaCK8C+asuSupFJtWyTRKwefDIEAFtekguRxLsDvxdtIGz3+LkCBDAy100Fs+PZ4HWKQXGQIHGw0KZW5kc3RyZWFtCmVuZG9iagpzdGFydHhyZWYKNTY2NAolJUVPRgo=\",\"idDefis\":\"000000002021002\"}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Simples Nacional - DEFIS](../../../generated/source/solucoes/integra-sn/defis/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sn/defis/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/dados_de_dominio/)

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/entregar_entrada/))
- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_entregar/))
- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_entregar/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/entregar_entrada/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/entregar_saida/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_entregar/)

- Última atualização informada pela fonte: 22 de dezembro de 2025 13:26:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `9df7861c63ef46a2094509d9a4d3aefb97e01f20923aab5dfe404c95a235218b`
