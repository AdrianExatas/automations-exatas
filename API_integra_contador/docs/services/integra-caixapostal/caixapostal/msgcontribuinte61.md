---
key: "CAIXAPOSTAL.MSGCONTRIBUINTE61"
family: "integra-caixapostal"
systemId: "CAIXAPOSTAL"
serviceId: "MSGCONTRIBUINTE61"
version: "1.0"
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Obter Lista de Mensagens por Contribuintes

Consulta de Mensagens por Contribuinte

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `CAIXAPOSTAL.MSGCONTRIBUINTE61` |
| Família | `integra-caixapostal` |
| Caminho físico | `POST /Consultar` |
| Versão | `1.0` |
| Situação oficial | 23/09/2022 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Obrigatória (00006) |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada — Objeto Dados: | cnpjReferencia | Number(14) | NÃO | -- | Número do CNPJ para filtro. Aplica-se apenas ao caso de contribuinte Pessoa Jurídica. |
| Dados de Entrada — Objeto Dados: | statusLeitura | Number(1) | SIM | 0 – Não se aplica 1 – Lida 2 – Não Lida | Status lida/não-lida da mensagem. |
| Dados de Entrada — Objeto Dados: | indicadorFavorito | Number(1) | NÃO | 0 – Não favorita 1 –Favorita | Indicador favorita/não favorita da mensagem. |
| Dados de Entrada — Objeto Dados: | indicadorPagina | Number(1) | SIM | 0 – Página inicial (contém as mensagens mais recentes) 1 – Página não-inicial | Indicador da página que está sendo solicitada. |
| Dados de Entrada — Objeto Dados: | ponteiroPagina | Number(14) *Passará a ser definido como Number(24) em 05/09/2026. | NÃO | -- | Ponteiro para página. Deve ser preenchido caso se escolha página não-inicial. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array of String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é uma string de tamanho 5 que representa um código interno do negócio. |
| Dados de Saída | dados | String (SCAPED STRING JSON: Dados) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Dados | codigo | Number (2) | — | Tabela: Lista códigos de retorno | Resultado da Requisição. |
| Dados de Saída — Objeto: Dados | indicadorUltimaPagina | String(1) | — | S – Sim N – Não | Indicador de Última Página. |
| Dados de Saída — Objeto: Dados | quantidadeMensagens | Number (2) | — | -- | Quantidade Total de Mensagens Encontradas. Até 50 elementos por página |
| Dados de Saída — Objeto: Dados | ponteiroPaginaRetornada | Number (14) *Passará a ser definido como Number(24) em 05/09/2026. | — | -- | Ponteiro Página Anterior. |
| Dados de Saída — Objeto: Dados | ponteiroProximaPagina | Number (6) | — | -- | Ponteiro Próxima Página. |
| Dados de Saída — Objeto: Dados | cnpjMatriz | Number (14) | — | -- | Número do CNPJ contribuinte Pessoa Jurídica. |
| Dados de Saída — Objeto: Dados | listaMensagens | Array of Objeto: Mensagem (50) | — | -- | Quantidade Total de Mensagens Encontradas. Até 50 elementos |
| Dados de Saída — Objeto Mensagem: | codigoSistemaRemetente | Number (5) | — | -- | Código do sistema remetente no Caixa Postal. |
| Dados de Saída — Objeto Mensagem: | codigoModelo | Number (5) | — | -- | Código do modelo da mensagem. |
| Dados de Saída — Objeto Mensagem: | dataEnvio | Number (8) | — | -- | Data do envio da mensagem. |
| Dados de Saída — Objeto Mensagem: | horaEnvio | Number (6) | — | -- | Hora do envio da mensagem. Formato: HHMMSS. |
| Dados de Saída — Objeto Mensagem: | numeroControle | String (20) | — | -- | Número de controle da mensagem no formato AAAA/999999999999999. |
| Dados de Saída — Objeto Mensagem: | indicadorLeitura | — | — | — | Indicador que informa se a mensagem foi lida. |
| Dados de Saída — Objeto Mensagem: | indicadorFavorito | Number (1) | — | 0 – Não lida 1 – Lida | Indicador que informa se a mensagem é favorita ou não |
| Dados de Saída — Objeto Mensagem: | dataLeitura | Number (8) | — | -- | Data da primeira leitura da mensagem. Formato: AAAAMMDD. |
| Dados de Saída — Objeto Mensagem: | horaLeitura | Number (6) | — | -- | Hora da primeira leitura da mensagem. Formato: HHMMSS. |
| Dados de Saída — Objeto Mensagem: | dataExclusao | Number (8) | — | -- | Data da exclusão da mensagem. Formato: AAAAMMDD. |
| Dados de Saída — Objeto Mensagem: | horaExclusao | Number (6) | — | -- | Hora da exclusão da mensagem. Formato: HHMMSS. |
| Dados de Saída — Objeto Mensagem: | dataCiencia | Number (8) | — | -- | Data da ciência da mensagem. Formato: AAAAMMDD. |
| Dados de Saída — Objeto Mensagem: | assuntoModelo | String (300) | — | -- | Assunto do modelo da mensagem. |
| Dados de Saída — Objeto Mensagem: | dataValidade | Number (8) | — | -- | Data de validade da mensagem. |
| Dados de Saída — Objeto Mensagem: | origemModelo | Number (1) | — | 1 – Sistema Remetente 2 – RFB | Origem do modelo da mensagem. |
| Dados de Saída — Objeto Mensagem: | valorParametroAssunto | String (50) | — | -- | Valor do parâmetro do assunto. |
| Dados de Saída — Objeto Mensagem: | relevancia | Number (1) | — | 1 – Sem relevância 2 – Com relevância | Indicador de relevância do modelo da mensagem. |
| Dados de Saída — Objeto Mensagem: | isn | Number (10) | — | -- | Identificador único do registro da mensagem do contribuinte. |
| Dados de Saída — Objeto Mensagem: | tipoOrigem | Number (1) | — | 1 – Receita 2 – Estado 3 – Município | Indicador do tipo de origem da mensagem. |
| Dados de Saída — Objeto Mensagem: | descricaoOrigem | String (100) | — | -- | Descrição da origem da mensagem podendo ser o nome da UA, nome do estado ou o nome do município. |

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
    "idServico": "MSGCONTRIBUINTE61",
    "versaoSistema": "1.0",
    "dados": "{\"statusLeitura\":\"0\",\"indicadorPagina\":\"\"ponteiroPagina\":\"00000000000000\"}"
  }
}
```

### Exemplo 2 — response

Fonte oficial:

```text
"contratante": {
       "numero": "99999999999999",
       "tipo": 2
   },
   "autorPedidoDados": {
       "numero": "99999999999999",
       "tipo": 2
   },
   "contribuinte": {
       "numero": "99999999999999",
       "tipo": 2
   },
   "pedidoDados": {
       "idSistema": "CAIXAPOSTAL",
       "idServico": "MSGCONTRIBUINTE61",
       "versaoSistema": "1.0",
       "dados": "{\"categoria\":\"0\",\"statusLeitura\":\"0\",\"indicadorPagina\":\"0\","indicadorFavorito": "1",\"ponteiroPagina\":\"00000000000000\"}"
   },
   "status": 200,
   "dados": "{\"codigo\":\"00\",\"conteudo\":[{\"quantidadeMensagens\":\"50\"indicadorUltimaPagina\":\"N\"ponteiroPaginaRetornada\":\"20250408092949\"ponteiroProximaPagina\":\"20250403093722\"cnpjMatriz\":\"03763656000154\",\"listaMensagens[{\"codigoSistemaRemetente\":\"00019\",\"codigoModelo\":\"00007\"dataEnvio\":\"20250408\",\"horaEnvio\":\"092949\"numeroControle\":\"2025/000000000032113\",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"20250423\"assuntoModelo\":\"Notificação de recebimento de mensagem e-MAC - Mensagnº ++VARIAVEL++ (complemento)\",\"dataValidade\":\"20250708\"origemModelo\":\"1\",\"valorParametroAssunto\":\"00160556\"relevancia\":\"2\",\"isn\":\"0001626772\",\"tipoOrigem\":\"0\"descricaoOrigem\":\"RECEITA FEDERAL DO BRASIL\"indicadorFavorito\":\"0\"},{\"codigoSistemaRemetente\":\"00019\"codigoModelo\":\"00007\",\"dataEnvio\":\"20250408\"horaEnvio\":\"092916\",\"numeroControle\":\"2025/000000000032112\"indicadorLeitura\":\"0\",\"dataLeitura\":\"\",\"horaLeitura\":\"\"dataExclusao\":\"\",\"horaExclusao\":\"\",\"dataCiencia\":\"20250423\"assuntoModelo\":\"Notificação de recebimento de mensagem e-MAC - Mensagnº ++VARIAVEL++ (complemento)\",\"dataValidade\":\"20250708\"origemModelo\":\"1\",\"valorParametroAssunto\":\"00158956\"relevancia\":\"2\",\"isn\":\"0001626771\",\"tipoOrigem\":\"0\"descricaoOrigem\":\"RECEITA FEDERAL DO BRASIL\"indicadorFavorito\":\"0\"},{\"codigoSistemaRemetente\":\"00019\"codigoModelo\":\"00007\",\"dataEnvio\":\"20250408\"horaEnvio\":\"092806\",\"numeroControle\":\"2025/000000000032111\"indicadorLeitura\":\"1\",\"dataLeitura\":\"20250408\"horaLeitura\":\"093111\",\"dataExclusao\":\"\",\"horaExclusao\":\"\"dataCiencia\":\"20250408\",\"assuntoModelo\":\"Notificação de recebimende mensagem e-MAC - Mensagem nº ++VARIAVEL++ (complemento)\"dataValidade\":\"20250708\",\"origemModelo\":\"1\"valorParametroAssunto\":\"00164756\",\"relevancia\":\"2\"isn\":\"0001626770\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00019\",\"codigoModelo\":\"00003\"dataEnvio\":\"20250408\",\"horaEnvio\":\"092210\"numeroControle\":\"2025/000000000032091\",\"indicadorLeitura\":\"1\"dataLeitura\":\"20250408\",\"horaLeitura\":\"092403\"dataExclusao\":\"\",\"horaExclusao\":\"\",\"dataCiencia\":\"20250408\"assuntoModelo\":\"Notificação de recebimento de mensagem e-MAC - Mensagnº ++VARIAVEL++ (nova)\",\"dataValidade\":\"20250708\"origemModelo\":\"1\",\"valorParametroAssunto\":\"00164756\"relevancia\":\"2\",\"isn\":\"0001626769\",\"tipoOrigem\":\"0\"descricaoOrigem\":\"RECEITA FEDERAL DO BRASIL\"indicadorFavorito\":\"0\"},{\"codigoSistemaRemetente\":\"00001\"codigoModelo\":\"00101\",\"dataEnvio\":\"20250407\"horaEnvio\":\"223135\",\"numeroControle\":\"2025/000000000000117\"indicadorLeitura\":\"1\",\"dataLeitura\":\"20250407\"horaLeitura\":\"223329\",\"dataExclusao\":\"\",\"horaExclusao\":\"\"dataCiencia\":\"20250407\",\"assuntoModelo\":\"TESTE CXPOSTAL-2949138envio de e-mail de alerta\",\"dataValidade\":\"20250523\"origemModelo\":\"1\",\"valorParametroAssunto\":\"\",\"relevancia\":\"2\"isn\":\"0001626765\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00001\",\"codigoModelo\":\"00101\"dataEnvio\":\"20250407\",\"horaEnvio\":\"223131\"numeroControle\":\"2025/000000000000116\",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"20250422\"assuntoModelo\":\"TESTE CXPOSTAL-2949138 - envio de e-mail de alerta\"dataValidade\":\"20250523\",\"origemModelo\":\"1\"valorParametroAssunto\":\"\",\"relevancia\":\"2\",\"isn\":\"0001626764\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEITA FEDERAL DO BRASIL\"indicadorFavorito\":\"0\"},{\"codigoSistemaRemetente\":\"00001\"codigoModelo\":\"00101\",\"dataEnvio\":\"20250407\"horaEnvio\":\"222915\",\"numeroControle\":\"2025/000000000000115\"indicadorLeitura\":\"1\",\"dataLeitura\":\"20250407\"horaLeitura\":\"222933\",\"dataExclusao\":\"\",\"horaExclusao\":\"\"dataCiencia\":\"20250407\",\"assuntoModelo\":\"TESTE CXPOSTAL-2949138envio de e-mail de alerta\",\"dataValidade\":\"20250523\"origemModelo\":\"1\",\"valorParametroAssunto\":\"\",\"relevancia\":\"2\"isn\":\"0001626763\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00001\",\"codigoModelo\":\"00101\"dataEnvio\":\"20250407\",\"horaEnvio\":\"222909\"numeroControle\":\"2025/000000000000114\",\"indicadorLeitura\":\"1\"dataLeitura\":\"20250407\",\"horaLeitura\":\"222949\"dataExclusao\":\"\",\"horaExclusao\":\"\",\"dataCiencia\":\"20250407\"assuntoModelo\":\"TESTE CXPOSTAL-2949138 - envio de e-mail de alerta\"dataValidade\":\"20250523\",\"origemModelo\":\"1\"valorParametroAssunto\":\"\",\"relevancia\":\"2\",\"isn\":\"0001626762\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEITA FEDERAL DO BRASIL\"indicadorFavorito\":\"0\"},{\"codigoSistemaRemetente\":\"00001\"codigoModelo\":\"00101\",\"dataEnvio\":\"20250407\"horaEnvio\":\"222903\",\"numeroControle\":\"2025/000000000000113\"indicadorLeitura\":\"1\",\"dataLeitura\":\"20250407\"horaLeitura\":\"222954\",\"dataExclusao\":\"\",\"horaExclusao\":\"\"dataCiencia\":\"20250407\",\"assuntoModelo\":\"TESTE CXPOSTAL-2949138envio de e-mail de alerta\",\"dataValidade\":\"20250523\"origemModelo\":\"1\",\"valorParametroAssunto\":\"\",\"relevancia\":\"2\"isn\":\"0001626761\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00019\",\"codigoModelo\":\"00007\"dataEnvio\":\"20250404\",\"horaEnvio\":\"094951\"numeroControle\":\"2025/000000000032077\",\"indicadorLeitura\":\"1\"dataLeitura\":\"20250407\",\"horaLeitura\":\"222648\"dataExclusao\":\"\",\"horaExclusao\":\"\",\"dataCiencia\":\"20250407\"assuntoModelo\":\"Notificação de recebimento de mensagem e-MAC - Mensagnº ++VARIAVEL++ (complemento)\",\"dataValidade\":\"20250704\"origemModelo\":\"1\",\"valorParametroAssunto\":\"00157856\"relevancia\":\"2\",\"isn\":\"0001626731\",\"tipoOrigem\":\"0\"descricaoOrigem\":\"RECEITA FEDERAL DO BRASIL\"indicadorFavorito\":\"0\"},{\"codigoSistemaRemetente\":\"00032\"codigoModelo\":\"00001\",\"dataEnvio\":\"20250403\"horaEnvio\":\"095643\",\"numeroControle\":\"                    \"indicadorLeitura\":\"1\",\"dataLeitura\":\"20250403\"horaLeitura\":\"100226\",\"dataExclusao\":\"\",\"horaExclusao\":\"\"dataCiencia\":\"\",\"assuntoModelo\":\"Aviso de publicação de editeletrônico - Edital nº ++VARIAVEL++\",\"dataValidade\":\"\"origemModelo\":\"1\",\"valorParametroAssunto\":\"001801910\"relevancia\":\"2\",\"isn\":\"0001626651\",\"tipoOrigem\":\"0\"descricaoOrigem\":\"RECEITA FEDERAL DO BRASIL\"indicadorFavorito\":\"0\"},{\"codigoSistemaRemetente\":\"00032\"codigoModelo\":\"00001\",\"dataEnvio\":\"20250403\"horaEnvio\":\"093803\",\"numeroControle\":\"                    \"indicadorLeitura\":\"0\",\"dataLeitura\":\"\",\"horaLeitura\":\"\"dataExclusao\":\"\",\"horaExclusao\":\"\",\"dataCiencia\":\"\"assuntoModelo\":\"Aviso de publicação de edital eletrônico - Edital ++VARIAVEL++\",\"dataValidade\":\"\",\"origemModelo\":\"1\"valorParametroAssunto\":\"001801809\",\"relevancia\":\"2\"isn\":\"0001626550\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00032\",\"codigoModelo\":\"00001\"dataEnvio\":\"20250403\",\"horaEnvio\":\"093802\"numeroControle\":\"                    \",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"\",\"assuntoModelo\":\"Aviso publicação de edital eletrônico - Edital nº ++VARIAVEL++\"dataValidade\":\"\",\"origemModelo\":\"1\"valorParametroAssunto\":\"001801808\",\"relevancia\":\"2\"isn\":\"0001626549\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00032\",\"codigoModelo\":\"00001\"dataEnvio\":\"20250403\",\"horaEnvio\":\"093801\"numeroControle\":\"                    \",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"\",\"assuntoModelo\":\"Aviso publicação de edital eletrônico - Edital nº ++VARIAVEL++\"dataValidade\":\"\",\"origemModelo\":\"1\"valorParametroAssunto\":\"001801807\",\"relevancia\":\"2\"isn\":\"0001626548\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00032\",\"codigoModelo\":\"00001\"dataEnvio\":\"20250403\",\"horaEnvio\":\"093800\"numeroControle\":\"                    \",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"\",\"assuntoModelo\":\"Aviso publicação de edital eletrônico - Edital nº ++VARIAVEL++\"dataValidade\":\"\",\"origemModelo\":\"1\"valorParametroAssunto\":\"001801806\",\"relevancia\":\"2\"isn\":\"0001626547\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00032\",\"codigoModelo\":\"00001\"dataEnvio\":\"20250403\",\"horaEnvio\":\"093759\"numeroControle\":\"                    \",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"\",\"assuntoModelo\":\"Aviso publicação de edital eletrônico - Edital nº ++VARIAVEL++\"dataValidade\":\"\",\"origemModelo\":\"1\"valorParametroAssunto\":\"001801805\",\"relevancia\":\"2\"isn\":\"0001626546\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00032\",\"codigoModelo\":\"00001\"dataEnvio\":\"20250403\",\"horaEnvio\":\"093758\"numeroControle\":\"                    \",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"\",\"assuntoModelo\":\"Aviso publicação de edital eletrônico - Edital nº ++VARIAVEL++\"dataValidade\":\"\",\"origemModelo\":\"1\"valorParametroAssunto\":\"001801804\",\"relevancia\":\"2\"isn\":\"0001626545\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00032\",\"codigoModelo\":\"00001\"dataEnvio\":\"20250403\",\"horaEnvio\":\"093757\"numeroControle\":\"                    \",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"\",\"assuntoModelo\":\"Aviso publicação de edital eletrônico - Edital nº ++VARIAVEL++\"dataValidade\":\"\",\"origemModelo\":\"1\"valorParametroAssunto\":\"001801803\",\"relevancia\":\"2\"isn\":\"0001626544\",\"tipoOrigem\":\"0\",\"descricaoOrigem\":\"RECEIFEDERAL DO BRASIL\",\"indicadorFavorito\":\"0\{\"codigoSistemaRemetente\":\"00032\",\"codigoModelo\":\"00001\"dataEnvio\":\"20250403\",\"horaEnvio\":\"093756\"numeroControle\":\"                    \",\"indicadorLeitura\":\"0\"dataLeitura\":\"\",\"horaLeitura\":\"\",\"dataExclusao\":\"\"horaExclusao\":\"\",\"dataCiencia\":\"\",\"assuntoModelo\":\"Aviso publicação de edital eletrônico - Edital nº ++VARIAVEL++\"dataValidade\":\"\",\"origemModelo\":\"1\"valorParametroAssunto\":\"001801802\",\"relevancia\":\"2\"isn\":\"0001626543\",\"tipoOrige
<EXEMPLO_TRUNCADO_TAMANHO_ORIGINAL_30272>
```

### Exemplo 3 — other

Fonte oficial:

```text
{
   "codigo":"00",
   "conteudo":[
      {
         "quantidadeMensagens":"50",
         "indicadorUltimaPagina":"N",
         "ponteiroPaginaRetornada":"20250408092949",
         "ponteiroProximaPagina":"20250403093722",
         "cnpjMatriz":"03763656000154",
         "listaMensagens":[
            {
               "codigoSistemaRemetente":"00019",
               "codigoModelo":"00007",
               "dataEnvio":"20250408",
               "horaEnvio":"092949",
               "numeroControle":"2025/000000000032113",
               "indicadorLeitura":"0",
               "dataLeitura":"",
               "horaLeitura":"",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250423",
               "assuntoModelo":"Notificação de recebimento de mensagem e-MAC - Mensagem nº ++VARIAVEL++ (complemento)",
               "dataValidade":"20250708",
               "origemModelo":"1",
               "valorParametroAssunto":"00160556",
               "relevancia":"2",
               "isn":"0001626772",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00019",
               "codigoModelo":"00007",
               "dataEnvio":"20250408",
               "horaEnvio":"092916",
               "numeroControle":"2025/000000000032112",
               "indicadorLeitura":"0",
               "dataLeitura":"",
               "horaLeitura":"",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250423",
               "assuntoModelo":"Notificação de recebimento de mensagem e-MAC - Mensagem nº ++VARIAVEL++ (complemento)",
               "dataValidade":"20250708",
               "origemModelo":"1",
               "valorParametroAssunto":"00158956",
               "relevancia":"2",
               "isn":"0001626771",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00019",
               "codigoModelo":"00007",
               "dataEnvio":"20250408",
               "horaEnvio":"092806",
               "numeroControle":"2025/000000000032111",
               "indicadorLeitura":"1",
               "dataLeitura":"20250408",
               "horaLeitura":"093111",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250408",
               "assuntoModelo":"Notificação de recebimento de mensagem e-MAC - Mensagem nº ++VARIAVEL++ (complemento)",
               "dataValidade":"20250708",
               "origemModelo":"1",
               "valorParametroAssunto":"00164756",
               "relevancia":"2",
               "isn":"0001626770",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00019",
               "codigoModelo":"00003",
               "dataEnvio":"20250408",
               "horaEnvio":"092210",
               "numeroControle":"2025/000000000032091",
               "indicadorLeitura":"1",
               "dataLeitura":"20250408",
               "horaLeitura":"092403",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250408",
               "assuntoModelo":"Notificação de recebimento de mensagem e-MAC - Mensagem nº ++VARIAVEL++ (nova)",
               "dataValidade":"20250708",
               "origemModelo":"1",
               "valorParametroAssunto":"00164756",
               "relevancia":"2",
               "isn":"0001626769",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00001",
               "codigoModelo":"00101",
               "dataEnvio":"20250407",
               "horaEnvio":"223135",
               "numeroControle":"2025/000000000000117",
               "indicadorLeitura":"1",
               "dataLeitura":"20250407",
               "horaLeitura":"223329",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250407",
               "assuntoModelo":"TESTE CXPOSTAL-2949138 - envio de e-mail de alerta",
               "dataValidade":"20250523",
               "origemModelo":"1",
               "valorParametroAssunto":"",
               "relevancia":"2",
               "isn":"0001626765",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00001",
               "codigoModelo":"00101",
               "dataEnvio":"20250407",
               "horaEnvio":"223131",
               "numeroControle":"2025/000000000000116",
               "indicadorLeitura":"0",
               "dataLeitura":"",
               "horaLeitura":"",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250422",
               "assuntoModelo":"TESTE CXPOSTAL-2949138 - envio de e-mail de alerta",
               "dataValidade":"20250523",
               "origemModelo":"1",
               "valorParametroAssunto":"",
               "relevancia":"2",
               "isn":"0001626764",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00001",
               "codigoModelo":"00101",
               "dataEnvio":"20250407",
               "horaEnvio":"222915",
               "numeroControle":"2025/000000000000115",
               "indicadorLeitura":"1",
               "dataLeitura":"20250407",
               "horaLeitura":"222933",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250407",
               "assuntoModelo":"TESTE CXPOSTAL-2949138 - envio de e-mail de alerta",
               "dataValidade":"20250523",
               "origemModelo":"1",
               "valorParametroAssunto":"",
               "relevancia":"2",
               "isn":"0001626763",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00001",
               "codigoModelo":"00101",
               "dataEnvio":"20250407",
               "horaEnvio":"222909",
               "numeroControle":"2025/000000000000114",
               "indicadorLeitura":"1",
               "dataLeitura":"20250407",
               "horaLeitura":"222949",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250407",
               "assuntoModelo":"TESTE CXPOSTAL-2949138 - envio de e-mail de alerta",
               "dataValidade":"20250523",
               "origemModelo":"1",
               "valorParametroAssunto":"",
               "relevancia":"2",
               "isn":"0001626762",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00001",
               "codigoModelo":"00101",
               "dataEnvio":"20250407",
               "horaEnvio":"222903",
               "numeroControle":"2025/000000000000113",
               "indicadorLeitura":"1",
               "dataLeitura":"20250407",
               "horaLeitura":"222954",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250407",
               "assuntoModelo":"TESTE CXPOSTAL-2949138 - envio de e-mail de alerta",
               "dataValidade":"20250523",
               "origemModelo":"1",
               "valorParametroAssunto":"",
               "relevancia":"2",
               "isn":"0001626761",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00019",
               "codigoModelo":"00007",
               "dataEnvio":"20250404",
               "horaEnvio":"094951",
               "numeroControle":"2025/000000000032077",
               "indicadorLeitura":"1",
               "dataLeitura":"20250407",
               "horaLeitura":"222648",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"20250407",
               "assuntoModelo":"Notificação de recebimento de mensagem e-MAC - Mensagem nº ++VARIAVEL++ (complemento)",
               "dataValidade":"20250704",
               "origemModelo":"1",
               "valorParametroAssunto":"00157856",
               "relevancia":"2",
               "isn":"0001626731",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00032",
               "codigoModelo":"00001",
               "dataEnvio":"20250403",
               "horaEnvio":"095643",
               "numeroControle":"                    ",
               "indicadorLeitura":"1",
               "dataLeitura":"20250403",
               "horaLeitura":"100226",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"",
               "assuntoModelo":"Aviso de publicação de edital eletrônico - Edital nº ++VARIAVEL++",
               "dataValidade":"",
               "origemModelo":"1",
               "valorParametroAssunto":"001801910",
               "relevancia":"2",
               "isn":"0001626651",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00032",
               "codigoModelo":"00001",
               "dataEnvio":"20250403",
               "horaEnvio":"093803",
               "numeroControle":"                    ",
               "indicadorLeitura":"0",
               "dataLeitura":"",
               "horaLeitura":"",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"",
               "assuntoModelo":"Aviso de publicação de edital eletrônico - Edital nº ++VARIAVEL++",
               "dataValidade":"",
               "origemModelo":"1",
               "valorParametroAssunto":"001801809",
               "relevancia":"2",
               "isn":"0001626550",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"00032",
               "codigoModelo":"00001",
               "dataEnvio":"20250403",
               "horaEnvio":"093802",
               "numeroControle":"                    ",
               "indicadorLeitura":"0",
               "dataLeitura":"",
               "horaLeitura":"",
               "dataExclusao":"",
               "horaExclusao":"",
               "dataCiencia":"",
               "assuntoModelo":"Aviso de publicação de edital eletrônico - Edital nº ++VARIAVEL++",
               "dataValidade":"",
               "origemModelo":"1",
               "valorParametroAssunto":"001801808",
               "relevancia":"2",
               "isn":"0001626549",
               "tipoOrigem":"0",
               "descricaoOrigem":"RECEITA FEDERAL DO BRASIL",
               "indicadorFavorito":"0"
            },
            {
               "codigoSistemaRemetente":"
<EXEMPLO_TRUNCADO_TAMANHO_ORIGINAL_44455>
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-caixapostal/caixapostal/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- **warning / official-pedido-dados-invalid-json:** O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_lista_de_mensagens_por_contribuintes/))
- **info / official-example-truncated-for-ai:** O exemplo extenso foi limitado no catálogo; a página normalizada e a fonte oficial preservam o contexto completo. ([fonte](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_lista_de_mensagens_por_contribuintes/))

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/servicos/obter_lista_de_mensagens_por_contribuintes/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/exemplos/retorno_obter_lista_de_mensagens_por_contribuintes/)

- Última atualização informada pela fonte: 31 de agosto de 2026 11:10:58 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `9fca1d7140689e6d8b45df7bd8fc345b0b567559edc9792e76fb987c8c82d70d`
