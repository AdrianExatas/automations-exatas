---
key: "REGIMEAPURACAO.EFETUAROPCAOREGIME101"
family: "integra-sn"
systemId: "REGIMEAPURACAO"
serviceId: "EFETUAROPCAOREGIME101"
version: "1.0"
operationPath: "Declarar"
sourceStatus: "fetched"
---

# Efetuar Opção pelo Regime de Apuração de Receitas

Efetuar a opção pelo Regime de Apuração de Receitas

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `REGIMEAPURACAO.EFETUAROPCAOREGIME101` |
| Família | `integra-sn` |
| Caminho físico | `POST /Declarar` |
| Versão | `1.0` |
| Situação oficial | 24/07/2023 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00060) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | anoOpcao | Number | SIM | — | Ano Opção |
| Dados de Entrada — Objeto Dados: | tipoRegime | Number | SIM | — | Tipo da opção |
| Dados de Entrada — Objeto Dados: | descritivoRegime | String | SIM | — | Descritivo do Regime . Este campo é para reforçar a escolha do campo tipoRegime |
| Dados de Entrada — Objeto Dados: | deAcordoResolucao | Boolean | SIM | — | Este campo deve ser enviado como True para ser efetivada a opção. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno, contendo uma lista em SCAPED Texto JSON com o objeto RegimeApuracao. |
| Dados de Saída — Objeto: RegimeApuracao | cnpjMatriz | Number | — | — | CNPJ da matriz |
| Dados de Saída — Objeto: RegimeApuracao | anoCalendario | Number | — | — | Ano Calendário solicitado |
| Dados de Saída — Objeto: RegimeApuracao | regimeEscolhido | String | — | — | Texto com o regime escolhido: "COMPETENCIA" ou "CAIXA" |
| Dados de Saída — Objeto: RegimeApuracao | dataHoraOpcao | Number | — | — | Data e horário da opção no formato AAAAMMDDHHMMSS |
| Dados de Saída — Objeto: RegimeApuracao | demonstrativoPdf | String | — | — | Demonstrativo de opção de Regime em formato base 64 |
| Dados de Saída — Objeto: RegimeApuracao | textoResolucao | String | — | — | Texto da resolução (no caso de regime de CAIXA) em formato base 64 |

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
    "idSistema": "REGIMEAPURACAO",
    "idServico": "EFETUAROPCAOREGIME101",
    "versaoSistema": "1.0",
    "dados": "{ \"anoOpcao\": 2023, \"tipoRegime\": 1, \"descritivoRegime\"CAIXA\", \"deAcordoResolucao\": true }"
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
        "idSistema": "REGIMEAPURACAO",
        "idServico": "EFETUAROPCAOREGIME101",
        "versaoSistema": "1.0",
        "dados": "{ \"anoCalendario\": \"2023\" }"
    },
    "status": 200,
    "dados": "{\"cnpjMatriz\":\"00000000000000\",\"anoCalendario\":2023,\"regimeEscolhido\":\"CAIXA\",\"dataHoraOpcao\":20221220025818,\"demonstrativoPdf\":\"<BASE64_REMOVIDO_TAMANHO_615760>\",\"textoResolucao\":\"Resolução CGSN nº 140, de 22 de maio de 2018. Dispõe sobre o Simples Nacional e dá outras providências. O Comitê Gestor do Simples Nacional (CGSN), no uso das competências que lhe conferem a Lei Complementar nº 123, de 14 de dezembro de 2006, o Decreto nº 6.038, de 7 de fevereiro de 2007, e o Regimento Interno aprovado pela Resolução CGSN nº 1, de 19 de março de 2007, resolve: Seção IV: Do Cálculo dos Tributos Devidos. Subseção I. Da Base de Cálculo. Art. 16. A base de cálculo para a determinação do valor devido mensalmente pela ME ou EPP optante pelo Simples Nacional será a receita bruta total mensal auferida (Regime de Competência) ou recebida (Regime de Caixa), conforme opção feita pelo contribuinte. (Lei Complementar nº 123, de 2006, art. 18, caput e § 3º) § 1º O regime de reconhecimento da receita bruta será irretratável para todo o ano-calendário. (Lei Complementar nº 123, de 2006, art. 18, § 3º). § 2º Na hipótese de a ME ou EPP possuir filiais, deverá ser considerado o somatório das receitas brutas de todos os estabelecimentos. (Lei Complementar nº 123, de 2006, art. 18, caput).§ 3º Para os efeitos do disposto neste artigo: I – a receita bruta auferida ou recebida será segregada na forma do art. 25; e (Lei Complementar nº 123, de 2006, art. 18, §§ 4º e 4º-A)    II - considera-se separadamente, em bases distintas, as receitas brutas auferidas ou recebidas no mercado interno e aquelas decorrentes de exportação para o exterior. (Lei Complementar nº 123, de 2006, art. 3º, § 15) Art. 17. Na hipótese de devolução de mercadoria vendida por ME ou EPP optante pelo Simples Nacional, em período de apuração posterior ao da venda, deverá ser observado o seguinte: (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 3º, § 1º).  I - o valor da mercadoria devolvida deve ser deduzido da receita bruta total, no período de apuração do mês da devolução, segregada pelas regras vigentes no Simples Nacional nesse mês; e II - caso o valor da mercadoria devolvida seja superior ao da receita bruta total ou das receitas segregadas relativas ao mês da devolução, o saldo remanescente deverá ser deduzido nos meses subsequentes, até ser integralmente deduzido. Parágrafo único. Para a optante pelo Simples Nacional tributada com base no critério de apuração de receitas pelo Regime de Caixa, o valor a ser deduzido limita-se ao valor efetivamente devolvido ao adquirente. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 3º, § 1º). Art. 18. Na hipótese de cancelamento de documento fiscal, nas situações autorizadas pelo respectivo ente federado, o valor do documento cancelado deverá ser deduzido no período de apuração no qual tenha havido a tributação originária, quando o cancelamento se der em período posterior. § 1º Para a optante pelo Simples Nacional tributada com base no critério de apuração de receitas pelo Regime de Caixa, o valor a ser deduzido limita-se ao valor efetivamente devolvido ao adquirente ou tomador.(Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 3º, § 1º). § 2º Na hipótese de nova emissão de documento fiscal em substituição ao cancelado, o valor correspondente deve ser oferecido à tributação no período de apuração relativo ao da operação ou prestação originária.(Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 3º, § 1º) Art. 19. A opção pelo regime de reconhecimento de receita bruta de que trata o § 1º do art. 16 deverá ser registrada em aplicativo disponibilizado no Portal do Simples Nacional, quando da apuração dos valores devidos: (Lei Complementar nº 123, de 2006, art. 18, § 3º). I - relativos ao mês de novembro de cada ano-calendário, com efeitos para o ano-calendário subsequente, na hipótese de ME ou EPP já optante pelo Simples Nacional; II - relativos ao mês de dezembro, com efeitos para o ano-calendário subsequente, na hipótese de ME ou EPP em início de atividade, com efeitos da opção pelo Simples Nacional no mês de dezembro; e III - relativos ao mês de início dos efeitos da opção pelo Simples Nacional, nas demais hipóteses, com efeitos para o próprio ano-calendário. Parágrafo único. A opção pelo Regime de Caixa servirá exclusivamente para a apuração da base de cálculo mensal, e o Regime de Competência deve ser aplicado para as demais finalidades, especialmente, para determinação dos limites e sublimites e da alíquota a ser aplicada sobre a receita bruta recebida no mês.(Lei Complementar nº 123, de 2006, art. 18, § 3º). Art. 20. Para a ME ou EPP optante pelo Regime de Caixa: (Lei Complementar nº 123, de 2006, art. 18, § 3º); I - nas prestações de serviços ou operações com mercadorias com valores a receber a prazo, a parcela não vencida deverá obrigatoriamente integrar a base de cálculo dos tributos abrangidos pelo Simples Nacional até o último mês do ano-calendário subsequente àquele em que tenha ocorrido a respectiva prestação de serviço ou operação com mercadorias; II - a receita auferida e ainda não recebida deverá integrar a base de cálculo dos tributos abrangidos pelo Simples Nacional, na hipótese de: a) encerramento de atividade, no mês em que ocorrer o evento; b) retorno ao Regime de Competência, no último mês de vigência do Regime de Caixa; e c) exclusão do Simples Nacional, no mês anterior ao dos efeitos da exclusão; III - o registro dos valores a receber deverá ser mantido nos termos do art. 77; e IV -  na hipótese do impedimento de que trata o art. 12, e havendo a continuidade do Regime de Caixa, a receita auferida e ainda não recebida deverá integrar a base de cálculo do ICMS e do ISS do mês anterior ao dos efeitos do impedimento e seu recolhimento deve ser feito diretamente ao respectivo ente federado, na forma por ele estabelecida, observados os arts. 21 a 24. Seção VIII. Das Obrigações Acessórias. Subseção III. Do Registro dos Valores a Receber no Regime de Caixa. Art. 77. A optante pelo Regime de Caixa deverá manter registro dos valores a receber, no modelo constante do Anexo XI, no qual constarão, no mínimo, as seguintes informações, relativas a cada prestação de serviço ou operação com mercadorias a prazo: (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º). I - número e data de emissão de cada documento fiscal; II - valor da operação ou prestação; III - quantidade e valor de cada parcela, bem como a data dos respectivos vencimentos; IV - data de recebimento e o valor recebido; V - saldo a receber; VI - créditos considerados não mais cobráveis. § 1º Na hipótese de haver mais de um documento fiscal referente a uma mesma prestação de serviço ou operação com mercadoria, estes deverão ser registrados conjuntamente. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) § 2º A adoção do Regime de Caixa pela ME ou EPP não a desobriga de manter em boa ordem e guarda os documentos e livros previstos nesta Resolução, inclusive com a discriminação completa de toda a sua movimentação financeira e bancária, constante do Livro Caixa, observado o disposto no § 3º do art. 61. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, inciso II e § 4º) § 3º Fica dispensado o registro na forma deste artigo em relação às prestações e operações realizadas por meio de administradoras de cartões, inclusive de crédito, desde que a ME ou EPP anexe ao respectivo registro os extratos emitidos pelas administradoras relativos às vendas e aos créditos respectivos. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) § 4º Aplica-se o disposto neste artigo para os valores decorrentes das prestações e operações realizadas por meio de cheques: (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) I - quando emitidos para apresentação futura, mesmo quando houver parcela à vista; II - quando emitidos para quitação da venda total, na ocorrência de cheques não honrados; III - não liquidados no próprio mês. § 5º A ME ou EPP deverá apresentar à administração tributária, quando solicitados, os documentos que comprovem a efetiva cobrança dos créditos considerados não mais cobráveis. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) § 6º São considerados meios de cobrança: (Lei Complementar nº 123, de 2006, art. 18, § 3º; art. 26, § 4º) I - notificação extrajudicial; II - protesto; III - cobrança judicial; IV - registro do débito em cadastro de proteção ao crédito. Art. 78. Na hipótese de descumprimento do disposto no art. 77, será desconsiderada, de ofício, a opção pelo Regime de Caixa, para os anos-calendário correspondentes ao período em que tenha ocorrido o descumprimento. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) Parágrafo único. Na hipótese do caput, os tributos abrangidos pelo Simples Nacional deverão ser recalculados pelo Regime de Competência, sem prejuízo dos acréscimos legais correspondentes. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º).\"}",
    "mensagens": [
        {
             "codigo": "[Sucesso-REGIME-MSG_ISN_054]",
             "texto": "Opção pelo regime de apuração de receitas realizada com sucesso."
        }
    ]
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
    "idSistema": "REGIMEAPURACAO",
    "idServico": "EFETUAROPCAOREGIME101",
    "versaoSistema": "1.0",
    "dados": "{ \"anoCalendario\": \"2023\" }"
  },
  "status": 200,
  "dados": "{\"cnpjMatriz\":\"00000000000000\",\"anoCalendario\":2023,\"regimeEscolhido\":\"CAIXA\",\"dataHoraOpcao\":20221220025818,\"demonstrativoPdf\":\"<BASE64_REMOVIDO_TAMANHO_615760>\",\"textoResolucao\":\"Resolução CGSN nº 140, de 22 de maio de 2018. Dispõe sobre o Simples Nacional e dá outras providências. O Comitê Gestor do Simples Nacional (CGSN), no uso das competências que lhe conferem a Lei Complementar nº 123, de 14 de dezembro de 2006, o Decreto nº 6.038, de 7 de fevereiro de 2007, e o Regimento Interno aprovado pela Resolução CGSN nº 1, de 19 de março de 2007, resolve: Seção IV: Do Cálculo dos Tributos Devidos. Subseção I. Da Base de Cálculo. Art. 16. A base de cálculo para a determinação do valor devido mensalmente pela ME ou EPP optante pelo Simples Nacional será a receita bruta total mensal auferida (Regime de Competência) ou recebida (Regime de Caixa), conforme opção feita pelo contribuinte. (Lei Complementar nº 123, de 2006, art. 18, caput e § 3º) § 1º O regime de reconhecimento da receita bruta será irretratável para todo o ano-calendário. (Lei Complementar nº 123, de 2006, art. 18, § 3º). § 2º Na hipótese de a ME ou EPP possuir filiais, deverá ser considerado o somatório das receitas brutas de todos os estabelecimentos. (Lei Complementar nº 123, de 2006, art. 18, caput).§ 3º Para os efeitos do disposto neste artigo: I – a receita bruta auferida ou recebida será segregada na forma do art. 25; e (Lei Complementar nº 123, de 2006, art. 18, §§ 4º e 4º-A)    II - considera-se separadamente, em bases distintas, as receitas brutas auferidas ou recebidas no mercado interno e aquelas decorrentes de exportação para o exterior. (Lei Complementar nº 123, de 2006, art. 3º, § 15) Art. 17. Na hipótese de devolução de mercadoria vendida por ME ou EPP optante pelo Simples Nacional, em período de apuração posterior ao da venda, deverá ser observado o seguinte: (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 3º, § 1º).  I - o valor da mercadoria devolvida deve ser deduzido da receita bruta total, no período de apuração do mês da devolução, segregada pelas regras vigentes no Simples Nacional nesse mês; e II - caso o valor da mercadoria devolvida seja superior ao da receita bruta total ou das receitas segregadas relativas ao mês da devolução, o saldo remanescente deverá ser deduzido nos meses subsequentes, até ser integralmente deduzido. Parágrafo único. Para a optante pelo Simples Nacional tributada com base no critério de apuração de receitas pelo Regime de Caixa, o valor a ser deduzido limita-se ao valor efetivamente devolvido ao adquirente. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 3º, § 1º). Art. 18. Na hipótese de cancelamento de documento fiscal, nas situações autorizadas pelo respectivo ente federado, o valor do documento cancelado deverá ser deduzido no período de apuração no qual tenha havido a tributação originária, quando o cancelamento se der em período posterior. § 1º Para a optante pelo Simples Nacional tributada com base no critério de apuração de receitas pelo Regime de Caixa, o valor a ser deduzido limita-se ao valor efetivamente devolvido ao adquirente ou tomador.(Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 3º, § 1º). § 2º Na hipótese de nova emissão de documento fiscal em substituição ao cancelado, o valor correspondente deve ser oferecido à tributação no período de apuração relativo ao da operação ou prestação originária.(Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 3º, § 1º) Art. 19. A opção pelo regime de reconhecimento de receita bruta de que trata o § 1º do art. 16 deverá ser registrada em aplicativo disponibilizado no Portal do Simples Nacional, quando da apuração dos valores devidos: (Lei Complementar nº 123, de 2006, art. 18, § 3º). I - relativos ao mês de novembro de cada ano-calendário, com efeitos para o ano-calendário subsequente, na hipótese de ME ou EPP já optante pelo Simples Nacional; II - relativos ao mês de dezembro, com efeitos para o ano-calendário subsequente, na hipótese de ME ou EPP em início de atividade, com efeitos da opção pelo Simples Nacional no mês de dezembro; e III - relativos ao mês de início dos efeitos da opção pelo Simples Nacional, nas demais hipóteses, com efeitos para o próprio ano-calendário. Parágrafo único. A opção pelo Regime de Caixa servirá exclusivamente para a apuração da base de cálculo mensal, e o Regime de Competência deve ser aplicado para as demais finalidades, especialmente, para determinação dos limites e sublimites e da alíquota a ser aplicada sobre a receita bruta recebida no mês.(Lei Complementar nº 123, de 2006, art. 18, § 3º). Art. 20. Para a ME ou EPP optante pelo Regime de Caixa: (Lei Complementar nº 123, de 2006, art. 18, § 3º); I - nas prestações de serviços ou operações com mercadorias com valores a receber a prazo, a parcela não vencida deverá obrigatoriamente integrar a base de cálculo dos tributos abrangidos pelo Simples Nacional até o último mês do ano-calendário subsequente àquele em que tenha ocorrido a respectiva prestação de serviço ou operação com mercadorias; II - a receita auferida e ainda não recebida deverá integrar a base de cálculo dos tributos abrangidos pelo Simples Nacional, na hipótese de: a) encerramento de atividade, no mês em que ocorrer o evento; b) retorno ao Regime de Competência, no último mês de vigência do Regime de Caixa; e c) exclusão do Simples Nacional, no mês anterior ao dos efeitos da exclusão; III - o registro dos valores a receber deverá ser mantido nos termos do art. 77; e IV -  na hipótese do impedimento de que trata o art. 12, e havendo a continuidade do Regime de Caixa, a receita auferida e ainda não recebida deverá integrar a base de cálculo do ICMS e do ISS do mês anterior ao dos efeitos do impedimento e seu recolhimento deve ser feito diretamente ao respectivo ente federado, na forma por ele estabelecida, observados os arts. 21 a 24. Seção VIII. Das Obrigações Acessórias. Subseção III. Do Registro dos Valores a Receber no Regime de Caixa. Art. 77. A optante pelo Regime de Caixa deverá manter registro dos valores a receber, no modelo constante do Anexo XI, no qual constarão, no mínimo, as seguintes informações, relativas a cada prestação de serviço ou operação com mercadorias a prazo: (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º). I - número e data de emissão de cada documento fiscal; II - valor da operação ou prestação; III - quantidade e valor de cada parcela, bem como a data dos respectivos vencimentos; IV - data de recebimento e o valor recebido; V - saldo a receber; VI - créditos considerados não mais cobráveis. § 1º Na hipótese de haver mais de um documento fiscal referente a uma mesma prestação de serviço ou operação com mercadoria, estes deverão ser registrados conjuntamente. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) § 2º A adoção do Regime de Caixa pela ME ou EPP não a desobriga de manter em boa ordem e guarda os documentos e livros previstos nesta Resolução, inclusive com a discriminação completa de toda a sua movimentação financeira e bancária, constante do Livro Caixa, observado o disposto no § 3º do art. 61. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, inciso II e § 4º) § 3º Fica dispensado o registro na forma deste artigo em relação às prestações e operações realizadas por meio de administradoras de cartões, inclusive de crédito, desde que a ME ou EPP anexe ao respectivo registro os extratos emitidos pelas administradoras relativos às vendas e aos créditos respectivos. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) § 4º Aplica-se o disposto neste artigo para os valores decorrentes das prestações e operações realizadas por meio de cheques: (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) I - quando emitidos para apresentação futura, mesmo quando houver parcela à vista; II - quando emitidos para quitação da venda total, na ocorrência de cheques não honrados; III - não liquidados no próprio mês. § 5º A ME ou EPP deverá apresentar à administração tributária, quando solicitados, os documentos que comprovem a efetiva cobrança dos créditos considerados não mais cobráveis. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) § 6º São considerados meios de cobrança: (Lei Complementar nº 123, de 2006, art. 18, § 3º; art. 26, § 4º) I - notificação extrajudicial; II - protesto; III - cobrança judicial; IV - registro do débito em cadastro de proteção ao crédito. Art. 78. Na hipótese de descumprimento do disposto no art. 77, será desconsiderada, de ofício, a opção pelo Regime de Caixa, para os anos-calendário correspondentes ao período em que tenha ocorrido o descumprimento. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º) Parágrafo único. Na hipótese do caput, os tributos abrangidos pelo Simples Nacional deverão ser recalculados pelo Regime de Competência, sem prejuízo dos acréscimos legais correspondentes. (Lei Complementar nº 123, de 2006, art. 2º, inciso I e § 6º; art. 18, § 3º; art. 26, § 4º).\"}",
  "mensagens": [
    {
      "codigo": "[Sucesso-REGIME-MSG_ISN_054]",
      "texto": "Opção pelo regime de apuração de receitas realizada com sucesso."
    }
  ]
}
```

## Referências relacionadas

### Mensagens

- [Mensagens específicas para o Integra Simples Nacional - REGIME](../../../generated/source/solucoes/integra-sn/regime/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-sn/regime/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/dados_de_dominio/)

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/efetuar_opcao/))
- **info / official-example-large-payload-redacted:** Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_efetuar_opcao/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/servicos/efetuar_opcao/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/exemplos/retorno_efetuar_opcao/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `36c8b93ce15514c991e7f1b9d961f908baf145918489e9bad7f7d9e537bae86f`
