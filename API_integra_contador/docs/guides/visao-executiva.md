# API Integra Contador — visão executiva e oportunidades de solução

> Documento para liderança e áreas de negócio. Não é necessário conhecimento técnico para a leitura.
>
> Base documental: fontes oficiais do SERPRO coletadas em 14 de setembro de 2026. O catálogo muda ao longo do tempo; antes de contratar ou estimar uma solução, a disponibilidade e as condições comerciais devem ser reconfirmadas.

## Resumo executivo

A API Integra Contador é uma porta oficial do SERPRO para que sistemas autorizados executem, de forma integrada, parte das atividades tributárias e cadastrais que hoje exigem navegação manual em portais governamentais.

Na prática, ela pode sustentar soluções para:

- acompanhar obrigações, mensagens, processos e situação fiscal de uma carteira de clientes;
- consultar declarações, recibos, pagamentos, parcelamentos e documentos;
- gerar guias como DAS e DARF, comprovantes, certificados e relatórios;
- transmitir algumas declarações e realizar determinadas ações fiscais;
- atender empresas do Simples Nacional, MEI e outros contribuintes em uma mesma plataforma;
- transformar ocorrências oficiais em alertas, filas de trabalho e indicadores de operação.

O maior valor não está em “ter acesso a uma API”, mas em substituir consultas repetitivas, downloads manuais e controles dispersos por processos padronizados, rastreáveis e escaláveis.

O catálogo analisado contém **12 famílias funcionais e 119 serviços lógicos**. Destes, **101 têm contrato técnico público localizado** e **18 aparecem no catálogo, mas ainda não possuem contrato público encontrado**. Há também **25 cenários oficiais de demonstração**. Essas contagens são uma fotografia do momento, não uma garantia permanente de oferta.

## Recomendação para decisão

Como primeira iniciativa, recomenda-se um **Painel de Pendências, Obrigações e Guias**, começando por consultas e monitoramento. Esse recorte gera valor rapidamente, reduz risco operacional e cria a fundação de segurança, procurações, auditoria e controle de custos necessária para automações mais sensíveis.

Um MVP poderia:

1. reunir os clientes autorizados em uma carteira única;
2. monitorar Caixa Postal, DTE e eventos de atualização;
3. exibir situação de declarações, recibos, pagamentos e parcelamentos;
4. solicitar a situação fiscal e organizar pendências;
5. gerar uma fila diária de alertas e atividades para a equipe;
6. permitir a emissão assistida de guias e documentos, com aprovação humana.

Transmissões e alterações de dados devem entrar depois, quando os controles de autorização, conferência, reconciliação e tratamento de falhas já estiverem maduros.

## Oportunidades de produto

| Oportunidade | Problema de negócio atendido | Solução que pode ser desenvolvida | Benefício esperado |
|---|---|---|---|
| Cockpit fiscal da carteira | Informações espalhadas em diferentes portais e controles | Visão única por cliente com obrigações, recibos, guias, pagamentos, parcelamentos, mensagens e situação fiscal | Menos consultas manuais e melhor priorização da equipe |
| Central de alertas | Eventos importantes dependem de consulta humana recorrente | Alertas de novas mensagens, DTE, alterações cadastrais/fiscais e mudanças no estado de solicitações | Menor risco de perda de prazo e resposta mais rápida |
| Automação do Simples Nacional | Apuração, declaração e geração de documentos consomem trabalho repetitivo | Fluxos para PGDAS-D, DEFIS, opção pelo regime de apuração e emissão de DAS | Ganho de escala no fechamento mensal |
| Esteira DCTFWeb e MIT | Consulta, conferência, transmissão e emissão ficam fragmentadas | Painel de declarações, recibos e XML; encerramento de MIT; transmissão e geração de DARF, conforme autorização | Processo mais padronizado e rastreável |
| Portal de autoatendimento MEI | Demandas simples ocupam canais de atendimento | Emissão de CCMEI e DAS, consulta de situação, declaração anual, benefícios e dívida ativa | Atendimento mais rápido e redução de tarefas operacionais |
| Gestor de parcelamentos | Modalidades e parcelas são acompanhadas separadamente | Visão consolidada dos parcelamentos, parcelas disponíveis, documentos de arrecadação e pagamentos | Menos inadimplência por esquecimento e menor esforço de acompanhamento |
| Conciliação de pagamentos | Comprovantes e baixas exigem verificação manual | Consulta de pagamentos, emissão de comprovantes e cruzamento com guias e obrigações internas | Menos divergências e fechamento mais confiável |
| Monitor de regularidade fiscal | A situação fiscal é consultada de forma reativa | Solicitação e organização periódica do relatório de situação fiscal, com encaminhamento de pendências | Atuação preventiva e melhor SLA ao cliente |
| Caixa de entrada fiscal | Mensagens oficiais chegam fora dos fluxos internos | Captura, classificação e distribuição de mensagens da Caixa Postal e indicador de DTE | Governança de comunicações e redução de risco |
| Acompanhamento de processos | Processos fiscais são acompanhados em canais separados | Consulta de processos por interessado e integração com filas internas | Visibilidade centralizada; expansão depende dos contratos ainda não publicados |
| Gestão de vínculos do contador | Vínculos e renúncias profissionais exigem controles próprios | Consulta de vínculos, solicitação e acompanhamento de renúncias e emissão de comprovantes | Cadastro profissional mais organizado |
| Fábrica de documentos fiscais | Guias e documentos são produzidos caso a caso | Consolidação e emissão de DARF, códigos de barras, DAS, recibos, certificados e comprovantes | Padronização e menor tempo de atendimento |

Os benefícios acima são hipóteses de produto. O ganho real depende do volume de clientes, frequência das tarefas, cobertura de procurações, custo comercial do serviço e integração com os processos internos.

## O que é possível por área

### Simples Nacional

- **PGDAS-D:** transmitir declaração mensal, consultar declarações por período, recuperar declaração e recibo, consultar extrato e emitir diferentes tipos de DAS.
- **DEFIS:** transmitir, listar e recuperar declaração e recibo.
- **Regime de apuração:** realizar opção e consultar opções, anos e resoluções relacionadas ao regime de caixa.

Possível aplicação: uma esteira mensal que prepara, confere, transmite com aprovação e armazena os comprovantes por cliente.

### DCTFWeb e MIT

- consultar declaração completa, recibo e XML;
- gerar DARF e DARF de declaração em andamento;
- transmitir DCTFWeb;
- consultar, encerrar e acompanhar apurações MIT.

O catálogo também anuncia funções avançadas — relatórios de créditos e débitos, MAED, vinculações, guia residual e edição de valor suspenso — cujos contratos públicos não foram localizados. Elas devem ser tratadas como oportunidade futura sujeita a confirmação do SERPRO.

### MEI

- emitir e consultar o CCMEI;
- consultar situação cadastral de CNPJs MEI vinculados a CPF;
- entregar e consultar DASN-SIMEI;
- emitir DAS por excesso de receita;
- gerar DAS e código de barras do PGMEI;
- consultar dívida ativa e atualizar benefício.

Possível aplicação: portal de autoatendimento ou operação em lote para escritórios com grande carteira de microempreendedores.

### Parcelamentos

A cobertura pública inclui consultas, parcelas disponíveis, emissão de DAS e detalhes de pagamento em várias modalidades do Simples e MEI: parcelamentos ordinários e especiais, PERT e RELP.

PAEX e SIPADE aparecem no catálogo com extratos e documentos de pagamento, mas sem contrato público localizado. Não devem compor prazo ou orçamento fechado antes de validação.

### Pagamentos, DARF e comprovantes

- consultar pagamentos e emitir comprovantes de arrecadação;
- consolidar e emitir DARF;
- consultar código de receita;
- emitir código de barras de DARF.

Possível aplicação: conciliação entre o que foi declarado, o que foi emitido e o que efetivamente foi pago.

### Situação fiscal e processos

- solicitar o protocolo e emitir o relatório de situação fiscal;
- consultar processos por interessado.

Lista de documentos, obtenção de documento e comunicados/intimações de processos aparecem no catálogo, porém sem contrato público localizado. Uma solução de gestão documental completa ainda depende dessa confirmação.

### Mensagens e eventos

- identificar novas mensagens na Caixa Postal;
- listar mensagens por contribuinte e obter detalhes;
- consultar o indicador DTE;
- solicitar e obter eventos de atualização de pessoas físicas e jurídicas.

Possível aplicação: transformar sinais oficiais em alertas, tarefas, responsáveis e prazos no sistema interno.

### Procurações e atuação do contador

- obter informações de procuração eletrônica;
- autenticar a atuação por procurador;
- consultar vínculos de profissionais contábeis;
- solicitar e acompanhar renúncias e emitir comprovantes.

Essas capacidades ajudam a governar quem pode agir por qual cliente, mas não eliminam a necessidade de manter certificados, poderes e consentimentos corretos.

## Três níveis de automação

| Nível | Exemplos | Risco operacional | Controle recomendado |
|---|---|---:|---|
| 1. Consultar e monitorar | Mensagens, situação fiscal, declarações, recibos, pagamentos, processos e parcelamentos | Menor | Acesso por perfil, logs e alertas de falha |
| 2. Gerar documentos | DAS, DARF, certificados, comprovantes e relatórios | Médio | Pré-visualização, aprovação e armazenamento vinculado ao cliente |
| 3. Transmitir ou alterar | Declarações, encerramento de apuração, opção de regime, benefício e renúncia | Maior | Dupla conferência, trilha de auditoria, reconciliação e tratamento de estado indeterminado |

Essa divisão é útil para priorizar entregas: começar por leitura e monitoramento, avançar para geração assistida e somente então automatizar atos que criam efeitos fiscais ou cadastrais.

## O que a API não resolve sozinha

A Integra Contador fornece capacidades de integração, mas uma solução empresarial ainda precisa de:

- cadastro confiável de clientes e responsáveis;
- certificado digital, credenciais e procurações válidas;
- regras de negócio e calendário de obrigações;
- conferência dos dados antes de transmissões;
- gestão segura dos documentos e dados pessoais;
- filas, aprovações, responsáveis e tratamento de exceções;
- suporte operacional e acompanhamento de mudanças do SERPRO;
- controle do consumo e dos custos contratados.

Ela também não deve ser interpretada como reprodução integral de tudo o que existe no e-CAC ou em outros portais. A cobertura deve ser confirmada serviço a serviço.

## Dependências e riscos para a liderança

### Contratação e cobrança

O acesso depende da relação comercial e das regras vigentes do SERPRO. Há operações cobradas e não cobradas, mas preço, franquia e enquadramento precisam ser validados na contratação. O business case deve incluir custo por chamada e volume esperado.

### Certificado, autenticação e procurações

A integração utiliza certificado digital e credenciais. Quando a empresa de software atua em nome de um contribuinte, pode ser necessária procuração eletrônica com poderes compatíveis com o serviço. Sem uma boa cobertura de autorizações, a automação não escala.

### Segurança, privacidade e auditoria

As respostas podem conter dados fiscais, cadastrais e documentos. A solução precisa controlar acesso, criptografar segredos e arquivos, registrar quem consultou ou transmitiu e definir retenção conforme LGPD e políticas internas.

### Falhas e estado indeterminado

Uma indisponibilidade ou timeout não significa necessariamente que uma transmissão falhou. Em especial, após um erro `504`, uma operação que altera dados não deve ser repetida automaticamente sem consulta ou reconciliação, pois pode já ter sido processada.

### Mudança de contratos

Campos, limites, mensagens e serviços podem mudar. Por isso, a documentação oficial deve ser monitorada e a integração precisa de testes e versionamento. Itens sem contrato público não devem entrar em escopo fechado.

## Proposta de implantação

### Onda 1 — visibilidade

- habilitar autenticação, certificados, procurações, logs e métricas;
- criar carteira de clientes e painel de consultas;
- monitorar mensagens, eventos, situação fiscal, pagamentos e parcelamentos;
- medir volume, tempo economizado, erros e cobertura de autorizações.

### Onda 2 — produtividade

- emitir guias, recibos, comprovantes, certificados e relatórios;
- integrar documentos ao repositório e ao fluxo de atendimento;
- adicionar aprovação humana e conciliação.

### Onda 3 — execução fiscal controlada

- transmitir declarações e realizar alterações suportadas;
- aplicar dupla conferência e regras de alçada;
- acompanhar o resultado oficial e tratar exceções sem duplicidade.

## Indicadores para avaliar o investimento

- minutos de trabalho manual eliminados por cliente e por mês;
- quantidade de acessos manuais a portais evitados;
- percentual da carteira com certificado e procuração adequados;
- quantidade de alertas relevantes identificados antes do prazo;
- tempo médio entre evento oficial e criação de tarefa interna;
- documentos e guias gerados sem retrabalho;
- taxa de falhas, reprocessamentos e divergências;
- custo SERPRO e custo operacional por cliente atendido;
- prazo de atendimento e satisfação das equipes usuárias.

## Decisões que a liderança precisa tomar

1. Qual carteira e qual processo repetitivo serão usados como piloto?
2. O primeiro objetivo é reduzir custo, reduzir risco de prazo ou criar um novo produto para clientes?
3. Quais ações poderão ser automáticas e quais exigirão aprovação humana?
4. Quem será responsável por certificados, procurações, segurança e suporte operacional?
5. Qual indicador definirá o sucesso do piloto em 60 a 90 dias?

## Leitura complementar e rastreabilidade

- [Índice completo dos serviços](../SERVICE_INDEX.md)
- [Catálogo estruturado](../../catalog/services.json)
- [Autenticação](autenticacao.md)
- [Procurações](procuracoes.md)
- [Erros, timeout e retentativas](erros-e-retentativas.md)
- [API Center oficial do Integra Contador](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/)
- [Central de Ajuda oficial do SERPRO](https://centraldeajuda.serpro.gov.br/duvidas/pt/documentacoes/informacoesdocumentacoes/)

Os números e estados de cobertura deste documento foram reconciliados com o catálogo local. Para uma decisão de implementação, consulte o contrato detalhado de cada serviço e confirme as condições vigentes com o SERPRO.
