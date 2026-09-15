---
key: "MIT.ENCAPURACAO314"
family: "integra-dctfweb"
systemId: "MIT"
serviceId: "ENCAPURACAO314"
version: null
operationPath: "Declarar"
sourceStatus: "fetched"
---

# Encerrar apuração

Encerrar Apuração MIT.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `MIT.ENCAPURACAO314` |
| Família | `integra-dctfweb` |
| Caminho físico | `POST /Declarar` |
| Versão | Não informada |
| Situação oficial | 28/03/2025 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não conclusivo |

## Entrada

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Entrada | PeriodoApuracao | Object | S | — | Período da apuração. |
| Dados de Entrada | MesApuracao | Number | S | — | Número do mês da apuração. Exemplo: 4. |
| Dados de Entrada | AnoApuracao | Number | S | — | Ano da apuração no formato AAAA. Exemplo: 2025. |
| Dados de Entrada | ListaEventosEspeciais | Array | N | — | Lista dos eventos especiais da Apuração, informados em ordem cronológica e sem repetição do dia. Quantidade máxima: 5. |
| Dados de Entrada | (sem nome) | Object | Sim, se houver o array ListaEventosEspeciais . | — | Agrupa os dados do evento especial (pode ocorrer mais de uma vez). |
| Dados de Entrada | IdEvento | Number | Sim, para cada ocorrência de objeto em ListaEventosEspeciais . | — | Número de identificação do evento especial com 1 dígito. Número único e sequencial: de 1 a 5. Exemplo: 1. |
| Dados de Entrada | DiaEvento | Number | Sim, para cada ocorrência de objeto em ListaEventosEspeciais . | — | Dia do evento especial. Exemplo: 13. |
| Dados de Entrada | TipoEvento | Number | Sim, para cada ocorrência de objeto em ListaEventosEspeciais . | — | Tipo do evento especial, sendo: 1: Extinção; 2: Fusão; 3: Cisão Total; 4: Cisão Parcial; 5: Incorporação (incorporada); 6: Incorporação (incorporadora). |
| Dados de Entrada | DadosIniciais | Object | S | — | Dados iniciais da apuração. |
| Dados de Entrada | SemMovimento | Boolean | S | — | Indicador de apuração sem movimento, sendo: false : Não; true : Sim. |
| Dados de Entrada | QualificacaoPj | Number | S | — | Qualificação da Pessoa Jurídica, sendo: 1: PJ em geral; 2: Agência de Fomento, Banco ou outra PJ de que trata o § 1° do art. 22 da Lei n° 8.212/1991; 3: Cooperativa de Crédito; 4: Sociedade Corretora de Seguros; 5: Sociedade Seguradora e de Capitalização ou Entidade Aberta de Previdência Complementar com fins lucrativos; 6: Entidade Fechada de Previdência Complementar ou Entidade Aberta de Previdência Complementar sem fins lucrativos; 7: Sociedade Cooperativa; 8: Sociedade Cooperativa de Produção Agropecuária ou de Consumo; 9: Autarquia ou Fundação Pública; 10: Empresa Pública, Sociedade de Economia Mista ou PJ de que trata o inc. III do art. 34 da Lei n° 10.833/2003; 11: Estado, Distrito Federal, Município ou Órgão Público da Administração Direta; 12: Mais de uma qualificação durante o mês. |
| Dados de Entrada | TributacaoLucro | Number | Sim, se SemMovimento for false e se QualificacaoPj for diferente de 11. | — | Forma de Tributação do Lucro, sendo: 1: Real Anual; 2: Real Trimestral; 3: Presumido; 4: Arbitrado; 5: Imune do IRPJ; 6: Isenta do IRPJ; 7: Optante pelo Simples Nacional. |
| Dados de Entrada | VariacoesMonetarias | Number | Sim, se SemMovimento for false . | — | Critério de reconhecimento das variações monetárias, sendo: 1: Regime de Caixa; 2: Regime de Competência; 3: Regime de Caixa - Elevada oscilação da taxa de câmbio. |
| Dados de Entrada | RegimePisCofins | Number | Sim, se SemMovimento for false e (se QualificacaoPj for [9] ou (se QualificacaoPj for [1] e se TributacaoLucro for [1, 2, 5 ou 6]) ou (se QualificacaoPj for [4, 8 ou 10] e se TributacaoLucro for diferente de [3, 4, 5 e 7]) ou (se QualificacaoPj for [12] e se TributacaoLucro for diferente de [7])). | — | Regime de apuração do PIS/Pasep e/ou da Cofins, sendo: 1: Não-cumulativa; 2: Cumulativa; 3: Não-cumulativa e Cumulativa; 4: Não se aplica. |
| Dados de Entrada | ResponsavelApuracao | Object | S | — | Dados do responsável pelo preenchimento da apuração. |
| Dados de Entrada | CpfResponsavel | String (11) | S | — | CPF do responsável com 11 dígitos. Exemplo: "12345678900". |
| Dados de Entrada | TelResponsavel | Object | N | — | Dados do telefone/celular do responsável. |
| Dados de Entrada | Ddd | String (2) | Sim, se houver o objeto TelResponsavel . | — | DDD do telefone/celular do responsável com 2 dígitos. Exemplo: "31". |
| Dados de Entrada | NumTelefone | String (9) | Sim, se houver o objeto TelResponsavel . | — | Número do telefone/celular do responsável com 8 ou 9 dígitos. Exemplo: "999999999". |
| Dados de Entrada | EmailResponsavel | String (60) | N | — | E-mail do responsável. Exemplo: "responsavel@mail.com". |
| Dados de Entrada | RegistroCrc | Object | N | — | Dados do registro profissional do responsável no Conselho Regional de Contabilidade. |
| Dados de Entrada | UfRegistro | String (2) | Sim, se houver o objeto RegistroCrc . | — | Sigla da unidade federativa do registro provisório ou definitivo originário do responsável, com letras maiúsculas. Exemplo: "SP". |
| Dados de Entrada | NumRegistro | String (11) | Sim, se houver o objeto RegistroCrc . | — | Número do registro profissional do responsável, podendo incluir sufixo no caso de registro transferido ou secundário, com tamanho de 6 a 11 dígitos. Exemplos: "123456", "SP123456", "123456O3", "123456TMG", "SP123456O3" e "123456O3TMG". |
| Dados de Entrada | Debitos | Object | Sim, se SemMovimento for false . | — | Dados dos débitos da Apuração, discriminados por grupo de tributo, os quais devem ser informados na ordem de apresentação desta tabela. Na Apuração com movimento, deve ser informado ao menos um débito. |
| Dados de Entrada | BalancoLucroReal | Boolean | Sim, se TributacaoLucro for 1, se não houver objeto na ListaEventosEspeciais com TipoEvento igual a 1, 2, 3 ou 5 e se não houver objeto na ListaEventosEspeciais com TipoEvento igual a 4 ou 6 e DiaEvento igual ao último dia do mês. | — | Indicador de que a PJ levantou balanço/balancete de suspensão ou redução no mês, sendo: false : Não; true : Sim. |
| Dados de Entrada | Irpj | Object | Não, mas pode existir somente se houver o objeto Debitos e se QualificacaoPj for diferente de [11]. | — | Dados dos débitos do grupo IRPJ. |
| Dados de Entrada | Csll | Object | Não, mas pode existir somente se houver o objeto Debitos , se QualificacaoPj for diferente de [11] e se TributacaoLucro for diferente de [7]. | — | Dados dos débitos do grupo CSLL. |
| Dados de Entrada | Irrf | Object | Não, mas pode existir somente se houver o objeto Debitos , se QualificacaoPj for diferente de [9 e 11] e se TributacaoLucro for diferente de 7. | — | Dados dos débitos do grupo IRRF. |
| Dados de Entrada | Ipi | Object | Não, mas pode existir somente se houver o objeto Debitos , se QualificacaoPj for diferente de [2, 3, 4, 5 e 6] e se TributacaoLucro for diferente de 7. | — | Dados dos débitos do grupo IPI. |
| Dados de Entrada | Iof | Object | Não, mas pode existir somente se houver o objeto Debitos . | — | Dados dos débitos do grupo IOF. |
| Dados de Entrada | PisPasep | Object | Não, mas pode existir somente se houver o objeto Debitos . | — | Dados dos débitos do grupo PIS/PASEP. |
| Dados de Entrada | Cofins | Object | Não, mas pode existir somente se houver o objeto Debitos . | — | Dados dos débitos do grupo COFINS. |
| Dados de Entrada | ContribuicoesDiversas | Object | Não, mas pode existir somente se houver o objeto Debitos . | — | Dados dos débitos do grupo CONTRIBUIÇÕES DIVERSAS. |
| Dados de Entrada | Cpss | Object | Não, mas pode existir somente se houver o objeto Debitos , se QualificacaoPj for [2, 9, 11 ou 12] e se TributacaoLucro for diferente de 7. | — | Dados dos débitos do grupo CPSS. |
| Dados de Entrada | RetPagamentoUnificado | Object | Não, mas pode existir somente se houver o objeto Debitos , se QualificacaoPj for [1, 7, 10 ou 12] e se TributacaoLucro for diferente de 7. | — | Dados dos débitos do grupo RET/PAGAMENTO UNIFICADO. |
| Dados de Entrada | ListaDebitos | Array | Sim, para os objetos Irpj , Csll , Irrf , Ipi , Iof , PisPasep , Cofins , ContribuicoesDiversas , Cpss e RetPagamentoUnificado . Exceção: opcional se houver o array ListaDebitosAposEvento . | — | Lista dos débitos do grupo de tributo. |
| Dados de Entrada | ListaDebitosAposEvento | Array | Não, mas pode existir para os objetos Irpj , Csll , Irrf , Ipi , Iof , PisPasep , Cofins , ContribuicoesDiversas , Cpss e RetPagamentoUnificado , somente se houver objeto em ListaEventosEspeciais com TipoEvento igual a 4 ou 6 e DiaEvento diferente do último dia do mês. | — | Lista dos débitos do grupo de tributo cujo fato gerador ocorreu após a data do evento especial. |
| Dados de Entrada | IdDebito | Number | Sim, para cada ocorrência de objeto em ListaDebitos e ListaDebitosAposEvento . | — | Número de identificação do débito com 1 ou mais dígitos. Número único e sequencial: de 1 até o valor correspondente à quantidade de débitos da Apuração. Exemplo: 1. |
| Dados de Entrada | IdEventoDebito | Number | Sim, para cada ocorrência de objeto em ListaDebitosAposEvento . | — | Número de identificação do evento especial até cuja data foram considerados os fatos geradores para a apuração do débito informado. Faz referência a um dos eventos da Apuração: valores de IdEvento . Exemplo: 1. |
| Dados de Entrada | CodigoDebito | String (6) | Sim, para cada ocorrência de objeto em ListaDebitos e ListaDebitosAposEvento . | — | Código de receita do débito com 6 dígitos. Exemplo: "022012". |
| Dados de Entrada | PaDebito | Number | Sim, para cada ocorrência de objeto em ListaDebitos e ListaDebitosAposEvento e se periodicidade do débito for diária, decendial ou quinzenal. | — | Período de apuração do débito, sendo: 1 a 31: para periodicidade diária; 1 a 3: para periodicidade decendial; 1 ou 2: para periodicidade quinzenal. |
| Dados de Entrada | AnoPostergado | Number | Sim, para os objetos Irpj e Csll , para cada ocorrência de objeto em ListaDebitos e em ListaDebitosAposEvento e se código do débito tiver final "10". | — | Ano do período de apuração do débito postergado no formato AAAA, podendo ser o mesmo ano da Apuração (apenas para débitos com periodicidade trimestral) ou algum dos cinco anos anteriores. Exemplo: 2020. |
| Dados de Entrada | TrimPostergado | Number | Sim, para cada ocorrência de objeto em ListaDebitos e em ListaDebitosAposEvento , se houver o campo AnoPostergado e se periodicidade do débito for trimestral. | — | Trimestre do período de apuração do débito postergado, com 1 dígito. Deve ser anterior ao trimestre do mês da Apuração. Exemplo: 2. |
| Dados de Entrada | AnoDebito | Number | Sim, para os objetos Irpj e Csll , para cada ocorrência de objeto em ListaDebitos , se MesApuracao for [1, 2 ou 3], se TributacaoLucro for [1], se IdEventoDebito for [1], se periodicidade do débito for anual e se código do débito não tiver final "10". | — | Ano de apuração do débito no formato AAAA, podendo ser o mesmo ano da Apuração ou o ano precedente. Aplica-se à hipótese em que os débitos relativos ao ajuste anual do IRPJ e da CSLL de um determinado ano podem ser declarados juntamente com os do ano anterior. Exemplo: 2024. |
| Dados de Entrada | CnpjEstabelecimento | String (6) | Sim, para o objeto Ipi ou se código do débito for do subgrupo CIDE, para cada ocorrência de objeto em ListaDebitos e em ListaDebitosAposEvento . | — | Últimos 6 dígitos do CNPJ do estabelecimento do débito (incluindo o DV). Exemplo: "000100". |
| Dados de Entrada | CnpjIncorporacao | String (14) | Sim, para o objeto RetPagamentoUnificado , para cada ocorrência de objeto em ListaDebitos e em ListaDebitosAposEvento e se código do débito for do tipo INC (6 dígitos) ou SCP (14 dígitos). | — | Últimos 6 dígitos (número de ordem + DV) do CNPJ da incorporação, para débitos de incorporação, ou CNPJ completo da incorporação com 14 dígitos, para débitos de SCP do grupo RET/PAGAMENTO UNIFICADO. Exemplos: "000100" e "12345678000195". |
| Dados de Entrada | CnpjScp | String (14) | Sim, para os objetos Irpj , Csll , PisPasep e Cofins , para cada ocorrência de objeto em ListaDebitos e em ListaDebitosAposEvento , se código do débito for de SCP e se período de apuração do débito for posterior a 2024. | — | CNPJ da SCP com 14 dígitos. Exemplo: "12345678000195". |
| Dados de Entrada | CodigoMunicipioOuro | String (7) | Sim, para cada ocorrência de objeto em ListaDebitos e em ListaDebitosAposEvento e se CodigoDebito for "402802". | — | Código IBGE do município de origem do ouro com 7 dígitos. Exemplo: "3550308". |
| Dados de Entrada | ValorDebito | Number | Sim, para cada ocorrência de objeto em ListaDebitos e ListaDebitosAposEvento . | — | Valor do débito apurado com 2 casas decimais. Exemplo: 777.55. |
| Dados de Entrada | ListaSuspensoes | Array | Não, mas pode existir somente se SemMovimento for false e se não houver o array ListaEventosEspeciais . | — | Lista das suspensões da apuração. |
| Dados de Entrada | TipoSuspensao | Number | Sim, para cada ocorrência de objeto em ListaSuspensoes . | — | Tipo da suspensão, sendo: 1: administrativa; 2: judicial. |
| Dados de Entrada | MotivoSuspensao | Number | Sim, para cada ocorrência de objeto em ListaSuspensoes e se TipoSuspensao for 2. | — | Motivo da suspensão judicial, sendo: 1: Liminar em Mandado de Segurança; 2: Depósito judicial do montante integral; 4: Antecipação de tutela; 5: Liminar em Medida Cautelar; 8: Sentença em Mandado de Segurança favorável ao contribuinte; 9: Sentença em Ação Ordinária favorável ao contribuinte e confirmada pelo TRF; 10: Acórdão do TRF favorável ao contribuinte; 11: Acórdão do STJ em Recurso Especial favorável ao contribuinte; 12: Acórdão do STF em Recurso Extraordinário favorável ao contribuinte; 13: Sentença de 1ª Instância não transitada em julgado com efeito suspensivo. |
| Dados de Entrada | ComDeposito | Boolean | Sim, para cada ocorrência de objeto em ListaSuspensoes e se MotivoSuspensao for diferente de 2. | — | Indicador de suspensão judicial com depósito, sendo: false: Não; true: Sim. |
| Dados de Entrada | NumeroProcesso | String (20) | Sim, para cada ocorrência de objeto em ListaSuspensoes . | — | Número do processo judicial (20 dígitos) ou administrativo (17 dígitos). Exemplos: "98765431220251017777" e "12345987654202450". |
| Dados de Entrada | ProcessoTerceiro | Boolean | Sim, para cada ocorrência de objeto em ListaSuspensoes e se TipoSuspensao for 2. | — | Indicador de que o processo judicial é de terceiro, sendo: false: Não (contribuinte é o autor); true: Sim. |
| Dados de Entrada | DataDecisao | Number | Sim, para cada ocorrência de objeto em ListaSuspensoes e se TipoSuspensao for 2. | — | Data da decisão judicial no formato AAAAMMDD. Exemplo: 20240920. |
| Dados de Entrada | VaraJudiciaria | Number | Sim, para cada ocorrência de objeto em ListaSuspensoes e se TipoSuspensao for 2. | — | Número da Vara Judiciaria onde tramita o processo, com tamanho de 1 a 4 dígitos. Exemplo: 1. |
| Dados de Entrada | CodigoMunicipioSj | String (7) | Sim, para cada ocorrência de objeto em ListaSuspensoes e se TipoSuspensao for 2. | — | Código IBGE do município sede da subseção judiciária onde tramita o processo, com 7 dígitos. Exemplo: "5002704". |
| Dados de Entrada | ListaDebitosSuspensos | Array | Sim, para cada ocorrência de objeto em ListaSuspensoes . | — | Lista dos débitos objeto da suspensão. |
| Dados de Entrada | IdDebitoSuspenso | Number | Sim, para cada ocorrência de objeto em ListaDebitosSuspensos . | — | Número de identificação do débito suspenso. Faz referência a um dos débitos da Apuração: valores de IdDebito . Exemplo: 1. |
| Dados de Entrada | ValorSuspenso | Number | Sim, para cada ocorrência de objeto em ListaDebitosSuspensos . | — | Valor suspenso do débito com 2 casas decimais. Exemplo: 1000.00. |
| Dados de Entrada | TransmissaoImediata | Boolean | Sim, se SemMovimento for true . | — | Indicador de que a DCTFWeb correspondente será transmitida imediatamente após o encerramento da Apuração, sem necessidade de intervenção do usuário, sendo: false : Não; true : Sim. |

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | String | — | — | Código HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de Object | — | — | Mensagens retornadas no acionamento do serviço. É um array de objetos compostos de código e texto da mensagem. |
| Dados de Saída | dados | String | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto dados: | protocoloEncerramento | String | — | — | Protocolo de encerramento da apuração. |
| Dados de Saída — Objeto dados: | idApuracao | Number | — | — | Identificador da apuração criada. |

## Exemplos oficiais e normalizados

### Exemplo 1 — other

Fonte oficial:

```text
"Dados": "{\"PeriodoApuracao\":{\"MesApuracao\":8,\"AnoApuracao\":2025},\"DadosIniciais\":{\"SemMovimento\":true,\"QualificacaoPj\":11,\"ResponsavelApuracao\":{\"CpfResponsavel\":\"12345678900\"}},\"TransmissaoImediata\":false}"
"Dados": "{\"PeriodoApuracao\":{\"MesApuracao\":3,\"AnoApuracao\":2025},\"ListaEventosEspeciais\":[{\"IdEvento\":1,\"DiaEvento\":12,\"TipoEvento\":4},{\"IdEvento\":2,\"DiaEvento\":21,\"TipoEvento\":2}],\"DadosIniciais\":{\"SemMovimento\":true,\"QualificacaoPj\":8,\"ResponsavelApuracao\":{\"CpfResponsavel\":\"12345678900\",\"TelResponsavel\":{\"Ddd\":\"31\",\"NumTelefone\":\"999999999\"},\"EmailResponsavel\":\"responsavel@mail.com\"}},\"TransmissaoImediata\":true}"   
"Dados": "{\"PeriodoApuracao\":{\"MesApuracao\":12,\"AnoApuracao\":2025},\"DadosIniciais\":{\"SemMovimento\":false,\"QualificacaoPj\":2,\"TributacaoLucro\":2,\"VariacoesMonetarias\":1,\"RegimePisCofins\":1,\"ResponsavelApuracao\":{\"CpfResponsavel\":\"12345678900\",\"RegistroCrc\":{\"UfRegistro\":\"SP\",\"NumRegistro\":\"123456O3TMG\"}}},\"Debitos\":{\"Irpj\":{\"ListaDebitos\":[{\"IdDebito\":1,\"CodigoDebito\":\"159901\",\"ValorDebito\":24000.00}]},\"Csll\":{\"ListaDebitos\":[{\"IdDebito\":2,\"CodigoDebito\":\"203001\",\"ValorDebito\":14000.00}]},\"Iof\":{\"ListaDebitos\":[{\"IdDebito\":3,\"CodigoDebito\":\"115003\",\"PaDebito\":3,\"ValorDebito\":4000.00},{\"IdDebito\":4,\"CodigoDebito\":\"402802\",\"PaDebito\":1,\"CodigoMunicipioOuro\":\"3550308\",\"ValorDebito\":880.00}]},\"Cofins\":{\"ListaDebitos\":[{\"IdDebito\":5,\"CodigoDebito\":\"585601\",\"ValorDebito\":1000.00}]},\"ContribuicoesDiversas\":{\"ListaDebitos\":[{\"IdDebito\":6,\"CodigoDebito\":\"874101\",\"CnpjEstabelecimento\":\"000100\",\"ValorDebito\":300.00}]}},\"ListaSuspensoes\":[{\"TipoSuspensao\":2,\"MotivoSuspensao\":1,\"ComDeposito\":true,\"NumeroProcesso\":\"98765431220251017777\",\"ProcessoTerceiro\":false,\"DataDecisao\":20240920,\"VaraJudiciaria\":1,\"CodigoMunicipioSj\":\"5002704\",\"ListaDebitosSuspensos\":[{\"IdDebitoSuspenso\":3,\"ValorSuspenso\":2000.00},{\"IdDebitoSuspenso\":5,\"ValorSuspenso\":800.00}]},{\"TipoSuspensao\":1,\"NumeroProcesso\":\"12345987654202450\",\"ListaDebitosSuspensos\":[{\"IdDebitoSuspenso\":6,\"ValorSuspenso\":300.00}]}]}"
"Dados": "{\"PeriodoApuracao\":{\"MesApuracao\":2,\"AnoApuracao\":2025},\"ListaEventosEspeciais\":[{\"IdEvento\":1,\"DiaEvento\":8,\"TipoEvento\":4},{\"IdEvento\":2,\"DiaEvento\":18,\"TipoEvento\":6}],\"DadosIniciais\":{\"SemMovimento\":false,\"QualificacaoPj\":1,\"TributacaoLucro\":1,\"VariacoesMonetarias\":2,\"RegimePisCofins\":3,\"ResponsavelApuracao\":{\"CpfResponsavel\":\"12345678900\",\"TelResponsavel\":{\"Ddd\":\"31\",\"NumTelefone\":\"999999999\"},\"EmailResponsavel\":\"responsavel@mail.com\",\"RegistroCrc\":{\"UfRegistro\":\"SP\",\"NumRegistro\":\"123456O3TMG\"}}},\"Debitos\":{\"BalancoLucroReal\":false,\"Irpj\":{\"ListaDebitos\":[{\"IdDebito\":1,\"CodigoDebito\":\"243001\",\"AnoDebito\":2024,\"ValorDebito\":3000.00},{\"IdDebito\":2,\"CodigoDebito\":\"243010\",\"AnoPostergado\":2020,\"ValorDebito\":1000.00}],\"ListaDebitosAposEvento\":[{\"IdDebito\":3,\"IdEventoDebito\":2,\"CodigoDebito\":\"236201\",\"ValorDebito\":6000.00},{\"IdDebito\":4,\"IdEventoDebito\":2,\"CodigoDebito\":\"236208\",\"CnpjScp\":\"12345678000195\",\"ValorDebito\":2000.00}]},\"Csll\":{\"ListaDebitosAposEvento\":[{\"IdDebito\":5,\"IdEventoDebito\":2,\"CodigoDebito\":\"248401\",\"ValorDebito\":5000.00}]},\"PisPasep\":{\"ListaDebitos\":[{\"IdDebito\":6,\"CodigoDebito\":\"543401\",\"PaDebito\":6,\"ValorDebito\":3000.00}],\"ListaDebitosAposEvento\":[{\"IdDebito\":7,\"IdEventoDebito\":1,\"CodigoDebito\":\"543401\",\"PaDebito\":12,\"ValorDebito\":300.00}]},\"RetPagamentoUnificado\":{\"ListaDebitos\":[{\"IdDebito\":8,\"CodigoDebito\":\"409501\",\"CnpjIncorporacao\":\"002112\",\"ValorDebito\":10000.00}],\"ListaDebitosAposEvento\":[{\"IdDebito\":9,\"IdEventoDebito\":1,\"CodigoDebito\":\"106802\",\"ValorDebito\":8000.00},{\"IdDebito\":10,\"IdEventoDebito\":2,\"CodigoDebito\":\"409502\",\"CnpjIncorporacao\":\"12345678000344\",\"ValorDebito\":8000.00}]}}}"
```

### Exemplo 2 — request

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
        "idSistema": "MIT",
        "idServico": "ENCAPURACAO314",
        "dados": "{\"PeriodoApuracao\":{\"MesApuracao\":8,\"AnoApuracao\":2025},\"DadosIniciais\":{\"SemMovimento\":true,\"QualificacaoPj\":11,\"ResponsavelApuracao\":{\"CpfResponsavel\":\"12345678900\"}},\"TransmissaoImediata\":false}"
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
    "idSistema": "MIT",
    "idServico": "ENCAPURACAO314",
    "dados": "{\"PeriodoApuracao\":{\"MesApuracao\":8,\"AnoApuracao\":2025},\"DadosIniciais\":{\"SemMovimento\":true,\"QualificacaoPj\":11,\"ResponsavelApuracao\":{\"CpfResponsavel\":\"12345678900\"}},\"TransmissaoImediata\":false}"
  }
}
```

### Exemplo 3 — response

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
        "idSistema": "MIT",
        "idServico": "ENCAPURACAO314",
        "versaoSistema": "1.0",
        "dados": "{\"PeriodoApuracao\":{\"MesApuracao\":8,\"AnoApuracao\":2025},\"DadosIniciais\":{\"SemMovimento\":true,\"QualificacaoPj\":11,\"ResponsavelApuracao\":{\"CpfResponsavel\":\"12345678900\"}},\"TransmissaoImediata\":false}"
    },
    "status": 200,
    "responseId": "8f770ff8-6079-4765-b430-c7fd65t7e8c1",
    "responseDateTime": "2025-03-27T19:07:02.925Z",
    "mensagens": [
        {
            "codigo": "[Sucesso-MIT]",
            "texto": "Requisição efetuada com sucesso."
        },
        {
            "codigo": "[Sucesso-MIT-MSG_0024]",
            "texto": "A apuração foi enviada para encerramento na DCTFWEB. Se desejar saber o status do encerramento, utilize a funcionalidade Consultar Situacao de Encerramento, passando o protocoloEncerramento devolvido nesta requisição."
        }
    ],
    "dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\",\"idApuracao\":0}"
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
    "idSistema": "MIT",
    "idServico": "ENCAPURACAO314",
    "versaoSistema": "1.0",
    "dados": "{\"PeriodoApuracao\":{\"MesApuracao\":8,\"AnoApuracao\":2025},\"DadosIniciais\":{\"SemMovimento\":true,\"QualificacaoPj\":11,\"ResponsavelApuracao\":{\"CpfResponsavel\":\"12345678900\"}},\"TransmissaoImediata\":false}"
  },
  "status": 200,
  "responseId": "8f770ff8-6079-4765-b430-c7fd65t7e8c1",
  "responseDateTime": "2025-03-27T19:07:02.925Z",
  "mensagens": [
    {
      "codigo": "[Sucesso-MIT]",
      "texto": "Requisição efetuada com sucesso."
    },
    {
      "codigo": "[Sucesso-MIT-MSG_0024]",
      "texto": "A apuração foi enviada para encerramento na DCTFWEB. Se desejar saber o status do encerramento, utilize a funcionalidade Consultar Situacao de Encerramento, passando o protocoloEncerramento devolvido nesta requisição."
    }
  ],
  "dados": "{\"protocoloEncerramento\":\"2fc4NTscrGXWTl4xbCX9rw==\",\"idApuracao\":0}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens Integra-DCTFWeb: MIT](../../../generated/source/solucoes/integra-dctfweb/mit/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- [Dados de domínio](../../../generated/source/solucoes/integra-dctfweb/mit/dados_de_dominio/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/dados_de_dominio/)

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/servicos/encerrar_apuracao/)

- Última atualização informada pela fonte: 10 de abril de 2026 14:58:42 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `dee1c8c1f63499eb5fe4e4e772d85611ad549a1eff0fe04e70d462728e737dea`
