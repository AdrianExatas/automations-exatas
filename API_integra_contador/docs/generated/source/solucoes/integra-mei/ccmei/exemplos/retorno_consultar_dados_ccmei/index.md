---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_consultar_dados_ccmei/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "5f12145d80a4b3e54fabba0b4a85f787e615d0a7a5b232b77fff0c3cf202c274"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_consultar_dados_ccmei/).

# Exemplo de Json de retorno

Exemplo do retorno da consulta dos dados de um CCMEI.

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
"idSistema": "CCMEI",
"idServico": "DADOSCCMEI122",
"versaoSistema": "1.0",
"dados": ""
},
"status": 200,
"mensagens": [
{
"codigo": "Sucesso-CCMEI-SUC-00020",
"texto": "Requisição efetuada com sucesso."
}
],
"dados": "{\"cnpj\":\"00000000000000\",\"empresario\":{\"nomeCivil\":\"AQUI VAI O NOME CIVIL\",\"nomeSocial\":null,\"cpf\":\"99999999999\"},\"dataInicioAtividades\":\"2020-01-01\",\"nomeEmpresarial\":\"AQUI VAI O NOME EMPRESARIAL\",\"capitalSocial\":1000.00,\"situacaoCadastralVigente\":\"ATIVA\",\"dataInicioSituacaoCadastral\":\"2020-01-01\",\"enderecoComercial\":{\"cep\":\"99999999\",\"logradouro\":\"AQUI VAI O NOME DO LOGRADOURO\",\"numero\":\"999\",\"complemento\":\"\",\"bairro\":\"AQUI VAI O BAIRRO\",\"municipio\":\"NOME DO MUNICIPIO\",\"uf\":\"UF\"},\"enquadramento\":{\"periodosMei\":[{\"indice\":1,\"dataInicio\":\"2020-01-01T00:00:00\",\"dataFim\":null}],\"situacao\":\"Enquadrado na condição de MEI\",\"optanteMei\":true},\"atividade\":{\"formasAtuacao\":[\"Estabelecimento fixo\",\"Internet\"],\"ocupacaoPrincipal\":{\"descricaoOcupacao\":\"AQUI VAI A DESCRICAO DA OCUPACAO\",\"codigoCNAE\":\"9999-9/99\",\"descricaoCNAE\":\"DESCRICAO DA CNAE\"},\"ocupacoesSecundarias\":[{\"descricaoOcupacao\":\"DESCRICAO DA OCUPACAO\",\"codigoCNAE\":\"9999999\",\"descricaoCNAE\":\"DESCRICAO DA CNAE\"}]},\"termoCienciaDispensa\":{\"titulo\":\"Termo de Ciência e Responsabilidade com Efeito de Dispensa de Alvará e Licença de Funcionamento\",\"texto\":\"Declaro, sob as penas da Lei, que conheço e atendo os requisitos legais exigidos pelo Estado e pela Prefeitura do Município para emissão do Alvará de Licença e Funcionamento, compreendidos os aspectos sanitários, ambientais, tributários, de segurança pública, uso e ocupação do solo, atividades domiciliares e restrições ao uso de espaços públicos. O não-atendimento a esses requisitos acarretará o cancelamento deste Alvará de Licença e Funcionamento Provisório.\"},\"qrCode\":null}"
}
```
