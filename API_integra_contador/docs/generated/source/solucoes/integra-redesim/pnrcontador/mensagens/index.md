---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "7f0acd67161446f712ae9029988bea645130137a8605a998c379634493f50f1d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/mensagens/).

# Mensagens de negócio

Observações: 1. As mensagens de negócio abaixo são retornadas pelo serviço Integra-Redesim para o módulo Integra-Contador. 2. Os códigos de mensagens seguem o padrão: [TipoMensagem-PNRCONTADOR-CódigoSequencial]. 3. O TipoMensagem pode ser: Sucesso, EntradaIncorreta, AcessoNegado, Erro, Aviso. 4. As mensagens que contêm '%s' indicam que há uma substituição dinâmica da mensagem com valores específicos relacionados ao erro ocorrido.

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Sucesso-PNRCONTADOR] | Requisição efetuada com sucesso. |  |
| [EntradaIncorreta-PNRCONTADOR-001] | Serviço não encontrado | O serviço informado no pedido de dados não é ofertado pelo Integra-Redesim. Verifique se o nome do serviço foi inserido corretamente. |
| [EntradaIncorreta-PNRCONTADOR-002] | Dados inválidos: %s | Houve um erro no processamento do JSON. Revise o corpo da requisição e tente novamente. |
| [EntradaIncorreta-PNRCONTADOR-003] | ID do Sistema não corresponde ao do Módulo Integra Contador Redesim | O idSistema informado não corresponde ao do Integra-Redesim. Houve um problema na distribuição da sua requisição pelo Integra-Contador. |
| [EntradaIncorreta-PNRCONTADOR-004] | Página inválida informada. | A page solicitada é inválida, seja por ser um número negativo ou grande demais. Realize a consulta sem informar a página para receber informações sobre a quantidade de páginas. |
| [EntradaIncorreta-PNRCONTADOR-005] | A renúncia informada não foi encontrada ou não pertence ao Autor do Pedido de Dados. | Verifique o ID da renúncia informada. |
| [EntradaIncorreta-PNRCONTADOR-006] | Tamanho da página inválido informado. | O pageSize solicitado é inválido. Este valor deve ser maior que zero e menor ou igual ao limite informado no serviço. |
| [EntradaIncorreta-PNRCONTADOR-007] | Para solicitar a Renúncia de um CNPJ, o 'cpfResponsavel' do Autor do Pedido de Dados e o 'cpfPreenchedor'(%s) da solicitacaoRenunciaContador devem ser preenchidas, válidos e idênticos. | Verifique se os campos autorPedidoDados.cpfResponsavel e o solicitacaoRenunciaContador.cpfPreenchedor foram informados e são iguais. |
| [EntradaIncorreta-PNRCONTADOR-008] | A solicitação da renúncia informada não foi encontrada. | Verifique o idSolicitacao informado no campo dados do pedidoDados . |
| [EntradaIncorreta-PNRCONTADOR-009] | O campo '%s' está incorreto, ausente, ou nulo. Verifique se o nome e seu conteúdo estão corretos. | Json do corpo (body) da requisição mal formado. Revise e corrija o campo informado na mensagem. |
| [EntradaIncorreta-PNRCONTADOR-010] | As datas 'dtInicio' e 'dtFim', se preenchidas, devem obedecer ao formato 'AAAA-MM-DD'. | Verifique se as datas dtInicio e dtFim estão no formato 'AAAA-MM-DD'. |
| [EntradaIncorreta-PNRCONTADOR-011] | Data inválida: o valor informado '%s' não corresponde a uma data válida no calendário. Verifique o dia, mês e ano informados. | Verifique o dia, mês e ano informados para a data referida. |
| [EntradaIncorreta-PNRCONTADOR-012] | A data 'dtFim' deve ser maior ou igual a data 'dtInicio'. | Certifique-se de que a data dtFim seja maior ou igual a data dtInicio . |
| [EntradaIncorreta-PNRCONTADOR-013] | %s | Possíveis erros de negócio retornado pelo CNPJ ou PNRCONTADOR. Verifique o que pede e faça as correções necessárias. |
| [EntradaIncorreta-PNRCONTADOR-014] | O solicitante não confirmou ciência e concordância com os termos das declarações obrigatórias. Consulte a documentação do serviço para ler as declarações antes de prosseguir. | Consulte a documentação do serviço para ler as declarações antes de prosseguir. |
| [AcessoNegado-PNRCONTADOR-101] | Solicitação de Renúncia não permitida: %s | Verifique o que pede a mensagem. Um Autor do Pedido de Dados só pode solicitar renúncia à um CNPJ que possua Vínculo Contabilista. |
| [AcessoNegado-PNRCONTADOR-102] | O Autor do Pedido de Dados não é Solicitante/Renunciante da Solicitação/Renúncia informada. | Para consultar a situação de uma solicitação de renúncia ou emitir um comprovante de renúncia, verifique o idSolicitacao e o idRenuncia do autorPedidoDados . |
| [AcessoNegado-PNRCONTADOR-103] | Solicitação de Renúncia não permitida: O %s do contador (%s) informado na Solicitação não corresponde ao Autor do Pedido de Dados. | Verifique o que pede a mensagem. Os NIs do autorPedidoDados e ( solicitacaoRenunciaContador.cpfContador ou solicitacaoRenunciaContador.cnpjEmpresaContabil ) informados na requisição devem ser iguais. |
| [Erro-PNRCONTADOR-202] | Ocorreu um erro interno: %s | Tente novamente mais tarde ou verifique o que pede a mensagem. |
| [Aviso-PNRCONTADOR-301] | A consulta não retornou dados. | Nenhuma ação necessária. |
| [Aviso-PNRCONTADOR-303] | Limite de requisições simultâneas atingido. Tente novamente mais tarde. | Seu limite de requisições simultâneas foi atingido. Tente novamente. |
| [Aviso-PNRCONTADOR-304] | Utilize o serviço 'Situação Solicitar Renúncia' para consultar a situação da solicitação. É recomendado um intervalo de pelo menos 30 segundos entre essas requisições, para garantir que a renúncia já tenha sido processada. | Nenhuma ação necessária. |
