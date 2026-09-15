# Contratos Express/Onvio

Somente contratos observados em sessao autenticada podem ser promovidos para o aplicativo.
As fixtures em `v1` sao sanitizadas: nao contem tokens, cookies, PDFs ou dados de clientes reais.

## Capacidades verificadas

- consulta paginada de clientes ativos do Gestta e correspondencia exata por CNPJ ou por raiz de CNPJ com razao social exata;
- consulta da conta/escritorio Onvio e confirmacao exata do vinculo pelo `external_id`;
- consulta de tarefas abertas do Express por empresa, com filtro local exato de tipo, documento configurado e competencia;
- leitura do detalhe da tarefa e do tipo de documento configurado;
- anexo multipart e confirmacao unica da tarefa;
- busca do documento publicado em todos os projetos do cliente;
- leitura dos metadados e atualizacao do vencimento com a tag `TAX_DOCUMENT`.

Versoes observadas em 14/08/2026: Gestta Core `1.0.1209`, Gestta Admin `1.0.2099` e
Portal `2025.09.18.1`. O manifesto [v1/manifest.json](v1/manifest.json) registra metodo,
rota, parametros e formatos sanitizados.

Os cinco grupos de capacidades estao verificados no manifesto. O gateway revalida a tarefa
e a ausencia do documento antes da escrita, registra o progresso local por etapa e nao repete
automaticamente uma conclusao cujo resultado seja incerto. Nenhum token, cookie, PDF ou dado
real de cliente faz parte das fixtures. `EXPRESS_DOCUMENTS_DEMO=1` continua disponivel apenas
para demonstracao e testes locais.
