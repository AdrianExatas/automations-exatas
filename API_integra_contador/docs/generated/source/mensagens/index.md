---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/mensagens/"
sourceUpdatedAt: "8 de setembro de 2026 20:02:14 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "da59e3647f88dfc2e8d61e719411a094b3c9206b34d0a4137b6b3b2f35659587"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/mensagens/).

# Mensagens do Gerenciador

As mensagens a seguir referem-se ao módulo gerenciador da API Integra Contador. Esse módulo é responsável gerenciamento de todos os pedidos de dados da solução do Integra Contador.

## Integra Contador - Gerenciador

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Erro-ICGERENCIADOR-001] | Erro no acionamento do serviço do tipo {0}. | Verifique no catálogo de serviços se o idSistema e idServico estão mapeados nos caminhos por tipo correspondente. HTTP STATUS: 500 |
| [Erro-ICGERENCIADOR-002] | Erro no acionamento do serviço {0} (Status HTTP {1}). | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar o erro. HTTP STATUS: 500 |
| [AcessoNegado-ICGERENCIADOR-003] | Nenhum cabeçalho enviado na requisição (x-jwt-assertion). | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-004] | Chave usada no token JWT não foi encontrada no WSO2 de SPO. | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-005] | Assinatura inválida do token recebido. | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [EntradaIncorreta-ICGERENCIADOR-006] | AutorPedidoDados: CNPJ inválido. | Corrija o dado de entrada informado. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-007] | AutorPedidoDados: CPF inválido. | Corrija o dado de entrada informado. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-008] | Contribuinte: CNPJ inválido. | Corrija o dado de entrada informado. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-009] | Contribuinte: CPF inválido. | Corrija o dado de entrada informado. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-010] | Contratante: CNPJ inválido. | Corrija o dado de entrada informado. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-011] | Contratante: CPF inválido. | Corrija o dado de entrada informado. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-012] | {0}: Tipo de NI inválido. | Corrija o dado de entrada informado. HTTP STATUS: 400 |
| [AcessoNegado-ICGERENCIADOR-013] | Validação da assinatura do jwt_token informado no header inválido. A assinatura é inválida. | HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-014] | O identificador do contratante (CNPJ) é inválido, pois está nulo ou vazio. Esse identificador é extraído do token x-jwt-assertion fornecido pela loja no e-commerce. | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-015] | O identificador do contratante (CNPJ) é inválido, pois está nulo ou vazio. Esse identificador é extraído do jwt_token que contém dados do certificado digital do Contratante validado no sistema de autenticação de API (SAPI). | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-016] | O identificador do contratante (CNPJ) é inválido, pois é diferente do CNPJ do Contratante extraído do certificado digital do Contratante informado pelo jwt_token validado no sistema de autenticação de API (SAPI). | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [EntradaIncorreta-ICGERENCIADOR-017] | Esse serviço acionado não é uma funcionalidade do tipo {0}. Verifique os códigos dos campos idSistema e idServiço no catálogo de serviços. | Acesse o Catálogo de Serviços para revisar o serviço acionado. HTTP STATUS: 400 |
| [AcessoNegado-ICGERENCIADOR-018] | Acesso negado. O identificador (CNPJ): {0} do Contratante informado é diferente do identificador (CNPJ) do Contratante habilitado no ecommerce. | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-019] | Acesso negado. Autor do pedido de dados não é o contratante da solução. É necessário enviar o termo de autorização com a assinatura do procurador ou do autor do pedido de dados. | Como o autor do pedido de dados é diferente do contratante, neste caso o autor do pedido de dados deverá assinar um termo de autorização e enviar antes de acionar o Integra Contador. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-020] | Acesso negado. Token de autenticação do procurador ou autor do pedido de dados não encontrado ou expirado. É necessário enviar o termo de autorização com a assinatura do procurador ou do autor do pedido de dados. | Verifique a data e hora de expiração do token e submeta no cabeçalho do HTTP. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-021] | Código do sistema {0} e/ou funcionalidade {1} não encontrados na lista de sistemas elegíveis ao Procuração Eletrônica. | Verifique o catálogo de serviços para indormar o idSistema e idServico vigente. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-022] | Acesso negado. O autor do pedido de dados de número:{0} não tem procuração autorizada no Portal eCAC para o Contribuinte de número {1}. | Por meio do Portal eCAC é necessário o Contribuinte atribuir de procuração eletrônica. HTTP STATUS: 403 |
| [Erro-ICGERENCIADOR-023] | Erro interno na validação de acesso. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar o erro. HTTP STATUS: 500 |
| [AcessoNegado-ICGERENCIADOR-025] | Falha na validação da assinatura digital do token JWT do SAPI ({0}). | Informe um jwt token válido no header da requisição ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-026] | Falha na decodificação do token JWT do SAPI ({0}). | Informe um jwt token válido no header da requisição ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-027] | Acesso negado. | Faça uma autenticação com credenciais válidas. HTTP STATUS: 403 |
| [Erro-ICGERENCIADOR-028] | Serviço não encontrado. | Verifique no catálogo de serviços se o idSistema e idServico estão mapeados nos caminhos por tipo correspondente. HTTP STATUS: 500 |
| [Erro-ICGERENCIADOR-029] | Erro ao acionar serviço. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar o erro. HTTP STATUS: 500 |
| [Erro-ICGERENCIADOR-030] | PROELETRON400 - Requisição Inválida. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar esse problema. HTTP STATUS: 400 |
| [Erro-ICGERENCIADOR-031] | PROELETRON403 - Requisição Não Autorizada. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar esse problema. HTTP STATUS: 403 |
| [Erro-ICGERENCIADOR-032] | PROELETRON404 - Sistemas Não Encontrados na Procuração. | Não tem procuração outorgada no eCAC. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-033] | PROELETRON500 - Erro Interno do Servidor. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar esse problema. HTTP STATUS: 403 |
| [Erro-ICGERENCIADOR-034] | PROELETRON500 - Erro Interno do Servidor. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar esse problema. HTTP STATUS: 500 |
| [Erro-ICGERENCIADOR-035] | PROELETRON503 - Falha na consulta ao sistema Procuração Eletrônica. Serviço indisponível. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar esse problema. HTTP STATUS: 500 |
| [Erro-ICGERENCIADOR-036] | PROELETRON{0} - Status HTTP não mapeado ou desconhecido. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar esse problema. HTTP STATUS: 500 |
| [AcessoNegado-ICGERENCIADOR-037] | Acesso negado. Houve uma falha na validação do token JWT. | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-038] | Acesso negado. Houve uma falha na validação do token JWT do SAPI. | Verifique ou tente uma nova autenticação na loja com credenciais válidas. HTTP STATUS: 403 |
| [EntradaIncorreta-ICGERENCIADOR-040] | Versão do Sistema inválida. | Informe o campo versão no formato válido. HTTP STATUS: 400 |
| [AcessoNegado-ICGERENCIADOR-041] | Acesso negado. HEADER jwt_token inválido. | Informe o parâmetro do HEADER jwt_token retornado do serviço de autenticação conforme orientação de Como solicitar os Tokens de Acesso Bearer e JWT token . HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-042] | Acesso negado. O token informado no cabeçalho da requisição HTTP (autenticar_procurador_token) tem tamanho diferente de 36 bytes ou o formato é inválido. Dado informado: autenticar_procurador_token=[{0}]. | Informe um token válido para autenticação do procurador ou autor do pedido de dados. Esse token deve ter o tamanho de 36 bytes. Vide documentação do Termo de Autorização . HTTP STATUS: 403 |
| [EntradaIncorreta-ICGERENCIADOR-043] | Contribuinte: o Tipo de inscrição é inválido para este idSistema. Foi informado um tipo de Contribuinte (PF ou PJ) para um sistema que não suporta este tipo de inscrição. | Alguns sistemas não suportam o tipo PF, outros aceitam o contribuinte PF e/ou PJ. Corrija o dado de entrada informado. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-044] | O serviço requisitado ainda não foi autorizado para ser acionado em produção. | O serviço requisitado não foi disponibilizado em produção. Acesse o Catálogo de Serviços para descobrir todos os serviços que são fornecidos. HTTP STATUS: 400 |
| [AcessoNegado-ICGERENCIADOR-045] | Acesso negado. Houve uma falha na validação dos dados de acesso desse contratante. Deve-se verificar a autenticação e submeter um access_token e jwt_token de credenciais válidas. | Verifique o processo de autenticação e envie credenciais da loja válidas como o os tokens de autenticados do tipo access_token e jwt_token. HTTP STATUS: 403 |
| [EntradaIncorreta-ICGERENCIADOR-046] | Contribuinte: a string contém caracteres inválidos no lote enviado. Só são aceitos números de 0 a 9 com a vírgula como separador dos números de inscrição (NI). | Só são aceitos números e separados por vírgula. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-047] | Contribuinte: inscrição {0} duplicada no lote. | Os números não podem ser repetidos. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-048] | Contribuinte: CNPJ inválido {0} no lote enviado. | Verifique se o número do CNPJ é válido antes de submeter a requisição. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-049] | Contribuinte: CPF inválido {0} no lote enviado. | Verifique se o número do CPF é válido antes de submeter a requisição. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-050] | Contribuinte: Numero - conteúdo inválido. O lote contém elemento nulo ou com espaço em branco. | Verifique se existe algum NI nulo ou com espaço em branco. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-051] | Contribuinte: Tipo - conteúdo inválido para este idServiço. Informe um tipo válido para prosseguir. | Verifique o tipo de NI informado para essa situação de lote de PF ou PJ para este tipo de idServiço. HTTP STATUS: 400 |
| [EntradaIncorreta-ICGERENCIADOR-052] | Identificação do sistema ou serviço inválida. Valor inexistente no catálogo de serviços. | Verifique o idSistema e o idServico informado. HTTP STATUS: 400 |
| [AcessoNegado-ICGERENCIADOR-053] | Acesso negado. O Contratante ({0}) não é o destinatário ({1}) que consta no Termo de Autorização. É necessário enviar o termo de autorização para o destinatário correto. | Foi enviado um termo de autorização para outro destinatário. Esses valores devem ser iguais. HTTP STATUS: 403 |
| [AcessoNegado-ICGERENCIADOR-054] | Acesso negado. Autor do pedido de dados ({0}) não foi quem assinou ({1}) o Termo de Autorização. É necessário enviar o termo de autorização com a assinatura do procurador ou do autor do pedido de dados correto. | Foi enviado um termo de autorização assinado por outro autor pedido de dados. Esses valores devem ser iguais. HTTP STATUS: 403 |
| [EntradaIncorreta-ICGERENCIADOR-055] | O serviço solicitado foi descontinuado. A notificação sobre essa mudança foi enviada antecipadamente aos clientes cadastrados na Loja, por e-mail. | O serviço invocado não está mais disponível para uso. HTTP STATUS: 400 |
| [Erro-ICGERENCIADOR-056] | Erro interno no acionamento do serviço de negócio {0}. Resposta sem conteúdo ou com conteúdo fora do padrão da aplicação. | Esse problema é interno, se persistir deverá abrir um chamado na central de serviços para tratar o erro. HTTP STATUS: 500 |
| [Erro-ICGERENCIADOR-057] | Contribuinte: a string contém caracteres inválidos no lote enviado. Só são aceitos números de 0 a 9 e letras de A a Z, com a vírgula como separador. | Contribuinte informado é inválido. HTTP STATUS: 400 |
| [Erro-{IdSistema}-058] | Não foi possível obter resposta do serviço {0}.{1} no tempo esperado ({2} segundos). Tente novamente em instantes. | Trate o erro 504 como uma falha temporária; Aguarde alguns instantes antes de tentar novamente; Consulte a situação da solicitação antes de reenviar quando possível; Guarde o responseId para facilitar o atendimento pelo suporte técnico, quando disponível e nos casos de abertura de um chamado. HTTP STATUS: 504 |
