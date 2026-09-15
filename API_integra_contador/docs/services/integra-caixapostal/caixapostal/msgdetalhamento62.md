---
key: "CAIXAPOSTAL.MSGDETALHAMENTO62"
family: "integra-caixapostal"
systemId: "CAIXAPOSTAL"
serviceId: "MSGDETALHAMENTO62"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Obter Detalhes de uma Mensagem Específica

Obter detalhes de uma mensagem específica

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `CAIXAPOSTAL.MSGDETALHAMENTO62` |
| Família | `integra-caixapostal` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00006) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | isn | Number(10) | SIM | -- | Identificador único do registro da mensagem do contribuinte.. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array of String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String (SCAPED STRING JSON: Dados) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Dados | codigo | Number (2) | — | Tabela: Lista códigos de retorno | Resultado da Requisição. |
| Dados de Saída — Objeto: Dados | conteudo | Array of Objeto: Mensagem (100) | — | -- | Mensagens Encontradas. |
| Dados de Saída — Objeto Mensagem: | codigoSistemaRemetente | Number (5) | — | -- | Código do sistema remetente no Caixa Postal. |
| Dados de Saída — Objeto Mensagem: | codigoModelo | Number (5) | — | -- | Código do modelo da mensagem. |
| Dados de Saída — Objeto Mensagem: | dataEnvio | Number (8) | — | -- | Data do envio da mensagem. |
| Dados de Saída — Objeto Mensagem: | horaEnvio | Number (6) | — | -- | Hora do envio da mensagem. Formato: HHMMSS. |
| Dados de Saída — Objeto Mensagem: | numeroControle | String (20) | — | -- | Número de controle da mensagem no formato AAAA/999999999999999. |
| Dados de Saída — Objeto Mensagem: | indFavorito | Number(1)) | — | 0 – Não favorita 1 –Favorita | Indicador que informa se a mensagem é favorita ou não |
| Dados de Saída — Objeto Mensagem: | dataLeitura | Number (8) | — | -- | Data da primeira leitura da mensagem. Formato: AAAAMMDD. |
| Dados de Saída — Objeto Mensagem: | horaLeitura | Number (6) | — | -- | Hora da primeira leitura da mensagem. Formato: HHMMSS. |
| Dados de Saída — Objeto Mensagem: | dataExclusao | Number (8) | — | -- | Data da exclusão da mensagem. Formato: AAAAMMDD. |
| Dados de Saída — Objeto Mensagem: | horaExclusao | Number (6) | — | -- | Hora da exclusão da mensagem. Formato: HHMMSS. |
| Dados de Saída — Objeto Mensagem: | dataCiencia | Number (8) | — | -- | Data da ciência da mensagem. Formato: AAAAMMDD. |
| Dados de Saída — Objeto Mensagem: | assuntoModelo | String (300) | — | -- | Assunto do modelo da mensagem. |
| Dados de Saída — Objeto Mensagem: | dataExpiracao | Number (8) | — | -- | Data de expiração da mensagem. |
| Dados de Saída — Objeto Mensagem: | origemModelo | Number (1) | — | 1 – Sistema Remetente 2 – RFB | Origem do modelo da mensagem. |
| Dados de Saída — Objeto Mensagem: | valorParametroAssunto | String (50) | — | -- | Valor do parâmetro do assunto. |
| Dados de Saída — Objeto Mensagem: | relevancia | Number (1) | — | 1 – Sem relevância 2 – Com relevância | Indicador de relevância do modelo da mensagem. |
| Dados de Saída — Objeto Mensagem: | isn | Number (10) | — | -- | Identificador único do registro da mensagem do contribuinte. |
| Dados de Saída — Objeto Mensagem: | tipoOrigem | Number (1) | — | 1 – Receita 2 – Estado 3 – Município | Indicador do tipo de origem da mensagem. |
| Dados de Saída — Objeto Mensagem: | descricaoOrigem | String (100) | — | -- | Descrição da origem da mensagem podendo ser o nome da UA, nome do estado ou o nome do município. |
| Dados de Saída — Objeto Mensagem: | corpoModelo | String (10500) | — | -- | Texto do corpo do modelo de mensagem |
| Dados de Saída — Objeto Mensagem: | variaveis | Array de Strings | — | -- | Valores dos parâmetros do corpo da mensagem. A quantidade de elementos do array depende da quantidade de variáveis do modelo de mensagem. |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

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
    "idSistema": "CAIXAPOSTAL",
    "idServico": "MSGDETALHAMENTO62",
    "versaoSistema": "1.0",
    "dados": "{\"isn\":\"0000082838\"}"
  }
}
```

Forma normalizada:

```json
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

### Exemplo 2 — response

Fonte oficial:

```text
{
    "contratante": {
      "numero": "99999999999",
      "tipo": 1
    },
    "autorPedidoDados": {
      "numero": "99999999999",
      "tipo": 1
    },
    "contribuinte": {
      "numero": "99999999999",
      "tipo": 1
    },
    "pedidoDados": {
      "idSistema": "CAIXAPOSTAL",
      "idServico": "MSGDETALHAMENTO62",
      "versaoSistema": "1.0",
      "dados": "{\"isn\" : \"0001488766\"}"
    },
    "status": 200,
    "dados": "{\"codigo\":\"00\",\"conteud[{\"codigoSistemaRemetente\":\"00014\",\"codigoModelo\":\"0000\"assuntoModelo\":\"[e-Processo] Dossiê: ++VARIAVEL++ - Abertura do DossiêAtendimento através do Chat RFB\",\"origemModelo\":\"\"dataEnvio\":\"20220620\",\"valorParametroAssunto\":\"11111.111111/2022-1\"dataLeitura\":\"20220623\",\"horaLeitura\":\"17005\"dataExpiracao\":\"20230621\",\"numeroControle\":\"\",\"dataCiencia\":\\"enquadramento\":\"0\",\"dataAcessoExterno\":\"\",\"horaAcessoExterno\":\\"tipoAutenticacaoUsuario\":\"0\",\"codigoAcesso\":\\"numeroSerieCertificadoDigital\":\"\",\"emissorCertificadoDigital\":\\"tipoUsuario\":\"0\",\"niUsuario\":\"00000000000000\",\"papelUsuario\":\"\"codigoAplicacao\":\"00000\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\\"corpoModelo\":\"<p>Prezado(a) Contribuinte,</p>  <p>O seu Atendimento pChat RFB&nbsp;n&ordm; ++1++, do dia/hora&nbsp;++2++ /&nbsp;++3++ (Hor&aacrio de Bras&iacute;lia), foi direcionado para solu&ccedil;&atilde;o por equinterna da RFB e consta no Dossi&ecirc; descrito abaixo. Para acompanhaatendimento interno do mesmo, o contribuinte deve acessar o Portal e-CAescolher a op&ccedil;&atilde;o &ldquo;Legisla&ccedil;&atilde;o e Processo &Processos&nbsp;Digitais (e-Processo) &gt; Meus Processos&rdquo; ou putilizar o app e-Processo.</p>  <p>Atrav&eacute;s do app e-Processo, ecirc; pode consultar as informa&ccedil;&otilde;es e acompanhar o andamedesse&nbsp;Dossi&ecirc;, bem como consultar os documentos. O app e-Proceest&aacute; dispon&iacute;vel para dispositivos m&oacute;veis nas lojasaplicativos Google Play Store, para o sistema Android, e Apple Store, parsistema iOS.</p>  <p>N&uacute;mero: ++4++</p>  <p>Interessado: ++5++</p>  Aacute;rea de Concentra&ccedil;&atilde;o do Servi&ccedil;o:&nbsp;++6++</<p>Servi&ccedil;o:&nbsp;++7++</p>  <p>Tipo do Dossi&ecirc;: ++8++</<p>Subtipo do Dossi&ecirc;: ++9++</p>  <p>Descri&ccedil;&atilde;o: ++10++</<p>Respons&aacute;vel pela Solicita&ccedil;&atilde;o de Atendimento: ++11p>  <p>Perfil de Acesso: ++12++</p>  <p>IMPORTANTE: Sugerimos consultaManual que est&aacute; dispon&iacute;vel no Portal e-CAC, na op&ccedil;&atio &ldquo;Legisla&ccedil;&atilde;o e Processo &gt; Processos Digit(e-Processo)&rdquo; para&nbsp;obter as orienta&ccedil;&otilde;es de uso funcionalidades do e-Processo.</p>  <p>O presente dossi&ecirc; de atendimeser&aacute; exclu&iacute;do&nbsp;ap&oacute;s 3&nbsp;(tr&ecirc;s) dias &uacteis, caso a solicita&ccedil;&atilde;o de juntada, contendo os documennecess&aacute;rios ao&nbsp;atendimento, n&atilde;o seja enviada.</p\"variaveis\":[\"202200000263\",\"20/06/2022\",\"14:31:05\",\"11111.1112022-11\",\"03.763.656/0001-54 - HMBHFIHUV KXPHIKQX H UHIEQKXU DVN\"ASSUNTOS ADUANEIROS\",\"CREDENCIAMENTO SISCOMEX/MERCANTE -PESSOA FÍSICDECLARAÇÃO SIMPLIFICADA, INCLUSIVE BAGAGEM DESACOMPANHADA - Inc. I do Art.da Portaria COANA nº 123/2015\",\"ATENDIMENTO\",\"CHAT RFB\",\"Criautomaticamente pelo Chat RFB, resultado de um atendimento não conclusipara ser tratado internamente por equipe especializada na Área/ServiçoAtendimento.\",\"999.999.999-99 - AXVOMZ NLIVML UVIRZMR\",\"ResponsáLegal\"]}]}",
    "mensagens": [
      {
        "codigo": "00",
        "texto": "Recuperação OK."
      }
    ]
}
```

### Exemplo 3 — other

Fonte oficial:

```text
{
  "codigo": "00",
  "conteudo": [{
    "codigoSistemaRemetente": "00014",
    "codigoModelo": "00009",
    "assuntoModelo": "[e-Processo] Dossiê: ++VARIAVEL++ - Abertura do DossiêAtendimento através do Chat RFB",
    "origemModelo": "1",
    "dataEnvio": "20220620",
    "valorParametroAssunto": "11111.111111/2022-11",
    "dataLeitura": "20220623",
    "horaLeitura": "170051",
    "dataExpiracao": "20230621",
    "numeroControle": "",
    "dataCiencia": "",
    "enquadramento": "0",
    "dataAcessoExterno": "",
    "horaAcessoExterno": "",
    "tipoAutenticacaoUsuario": "0",
    "codigoAcesso": "",
    "numeroSerieCertificadoDigital": "",
    "emissorCertificadoDigital": "",
    "tipoUsuario": "0",
    "niUsuario": "00000000000000",
    "papelUsuario": "0",
    "codigoAplicacao": "00000",
    "tipoOrigem": "0",
    "descricaoOrigem": "",
    "corpoModelo": "<p>Prezado(a) Contribuinte,</p> <p>O seu Atendimento pelo CRFB nº ++1++, do dia/hora ++2++ / ++3++ (Horário de Brasília), foi direcionpara solução por equipe interna da RFB e consta no Dossiê descrito abaiPara acompanhar o atendimento interno do mesmo, o contribuinte deve acessaPortal e-CAC e escolher a opção “Legislação e Processo > Processos Digit(e-Processo) > Meus Processos” ou pode utilizar o app e-Processo.<<p>Através do app e-Processo, você pode consultar as informações e acompano andamento desse Dossiê, bem como consultar os documentos. O app e-Proceestá disponível para dispositivos móveis nas lojas de aplicativos Google PStore, para o sistema Android, e Apple Store, para o sistema iOS.<<p>Número: ++4++</p> <p>Interessado: ++5++</p> <p>Área de ConcentraçãoServiço: ++6++</p> <p>Serviço: ++7++</p> <p>Tipo do Dossiê: ++8++<<p>Subtipo do Dossiê: ++9++</p> <p>Descrição: ++10++</p> <p>Responsável pSolicitação de Atendimento: ++11++</p> <p>Perfil de Acesso: ++12++<<p>IMPORTANTE: Sugerimos consultar o Manual que está disponível no Pore-CAC, na opção “Legislação e Processo > Processos Digitais (e-Processo)” pobter as orientações de uso das funcionalidades do e-Processo.</p> <presente dossiê de atendimento será excluído após 3 (três) dias úteis, cassolicitação de juntada, contendo os documentos necessários ao atendimento, seja enviada.</p>",
    "variaveis": ["202200000263", "20/06/2022", "14:31:05", "11111.1112022-11", "03.763.656/0001-54 - HMBHFIHUV KXPHIKQX H UHIEQKXU DVNW", "ASSUNADUANEIROS", "CREDENCIAMENTO SISCOMEX/MERCANTE -PESSOA FÍSICA - DECLARASIMPLIFICADA, INCLUSIVE BAGAGEM DESACOMPANHADA - Inc. I do Art. 8º da PortaCOANA nº 123/2015", "ATENDIMENTO", "CHAT RFB", "Criado automaticamente pChat RFB, resultado de um atendimento não conclusivo, para ser tratinternamente por equipe especializada na Área/Serviço do Atendimento.", "999.999-99 - AVZRMZ NLIVML UVIRZMR", "Responsável Legal"]
  }]
}
```

Forma normalizada:

```json
{
  "codigo": "00",
  "conteudo": [
    {
      "codigoSistemaRemetente": "00014",
      "codigoModelo": "00009",
      "assuntoModelo": "[e-Processo] Dossiê: ++VARIAVEL++ - Abertura do DossiêAtendimento através do Chat RFB",
      "origemModelo": "1",
      "dataEnvio": "20220620",
      "valorParametroAssunto": "11111.111111/2022-11",
      "dataLeitura": "20220623",
      "horaLeitura": "170051",
      "dataExpiracao": "20230621",
      "numeroControle": "",
      "dataCiencia": "",
      "enquadramento": "0",
      "dataAcessoExterno": "",
      "horaAcessoExterno": "",
      "tipoAutenticacaoUsuario": "0",
      "codigoAcesso": "",
      "numeroSerieCertificadoDigital": "",
      "emissorCertificadoDigital": "",
      "tipoUsuario": "0",
      "niUsuario": "00000000000000",
      "papelUsuario": "0",
      "codigoAplicacao": "00000",
      "tipoOrigem": "0",
      "descricaoOrigem": "",
      "corpoModelo": "<p>Prezado(a) Contribuinte,</p> <p>O seu Atendimento pelo CRFB nº ++1++, do dia/hora ++2++ / ++3++ (Horário de Brasília), foi direcionpara solução por equipe interna da RFB e consta no Dossiê descrito abaiPara acompanhar o atendimento interno do mesmo, o contribuinte deve acessaPortal e-CAC e escolher a opção “Legislação e Processo > Processos Digit(e-Processo) > Meus Processos” ou pode utilizar o app e-Processo.<<p>Através do app e-Processo, você pode consultar as informações e acompano andamento desse Dossiê, bem como consultar os documentos. O app e-Proceestá disponível para dispositivos móveis nas lojas de aplicativos Google PStore, para o sistema Android, e Apple Store, para o sistema iOS.<<p>Número: ++4++</p> <p>Interessado: ++5++</p> <p>Área de ConcentraçãoServiço: ++6++</p> <p>Serviço: ++7++</p> <p>Tipo do Dossiê: ++8++<<p>Subtipo do Dossiê: ++9++</p> <p>Descrição: ++10++</p> <p>Responsável pSolicitação de Atendimento: ++11++</p> <p>Perfil de Acesso: ++12++<<p>IMPORTANTE: Sugerimos consultar o Manual que está disponível no Pore-CAC, na opção “Legislação e Processo > Processos Digitais (e-Processo)” pobter as orientações de uso das funcionalidades do e-Processo.</p> <presente dossiê de atendimento será excluído após 3 (três) dias úteis, cassolicitação de juntada, contendo os documentos necessários ao atendimento, seja enviada.</p>",
      "variaveis": [
        "202200000263",
        "20/06/2022",
        "14:31:05",
        "11111.1112022-11",
        "03.763.656/0001-54 - HMBHFIHUV KXPHIKQX H UHIEQKXU DVNW",
        "ASSUNADUANEIROS",
        "CREDENCIAMENTO SISCOMEX/MERCANTE -PESSOA FÍSICA - DECLARASIMPLIFICADA, INCLUSIVE BAGAGEM DESACOMPANHADA - Inc. I do Art. 8º da PortaCOANA nº 123/2015",
        "ATENDIMENTO",
        "CHAT RFB",
        "Criado automaticamente pChat RFB, resultado de um atendimento não conclusivo, para ser tratinternamente por equipe especializada na Área/Serviço do Atendimento.",
        "999.999-99 - AVZRMZ NLIVML UVIRZMR",
        "Responsável Legal"
      ]
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-caixapostal/caixapostal/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-example-invalid-json:** O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_detalhes_de_uma_mensagem_especifica/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_detalhes_de_uma_mensagem_especifica/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_detalhes_de_uma_mensagem_especifica/)

- Última atualização informada pela fonte: 31 de agosto de 2026 11:10:58 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `482eadaf841e10dde82a2fa85a8ad74349b430fb0d92fa2162fa099f49bffa6c`
