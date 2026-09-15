---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_detalhes_de_uma_mensagem_especifica/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "18a9551be121500ce841304d0701c276da9c5df4730d8ceb199e3f3ace889ae8"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_detalhes_de_uma_mensagem_especifica/).

# Exemplo de Json de retorno

Detalhar de uma mensagem específica

## Json de retorno completo

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

## Json do campo "dados"

Nesse exemplo o json está formatado e sem o scaped string. O exemplo completo é demonstrado acima.

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
