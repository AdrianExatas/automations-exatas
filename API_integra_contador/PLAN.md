# Automação de conferência REINF × DCTFWeb × Domínio

## Resumo

É tecnicamente viável. A automação comparará os totalizadores da EFD-Reinf armazenados no banco Domínio com o XML oficial da DCTFWeb obtido pelo serviço `DCTFWEB.CONSXMLDECLARACAO38` do [SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/consultar_xml_declaracao/).

O banco consultado já possui dados estruturados para R-2000 e R-4000, incluindo competência, evento, recibo, código de receita, base de cálculo, retenções, contribuições e suspensões. O Domínio também mantém os XMLs enviados à EFD-Reinf, conforme o fluxo documentado pela [Thomson Reuters](https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=5907).

A solução será somente de consulta: não alterará o banco Domínio, não transmitirá DCTFWeb e não corrigirá eventos automaticamente.

## Implementação

- Criar uma aplicação Python/Streamlit em `Dominio/reinf-dctfweb-conferencia`, com painel, processamento em lote, consulta individual e exportação Excel.
- Consultar o Domínio via ODBC somente leitura, usando as tabelas de envio e retorno REINF:
  - R-2000: fechamento R-2099 e respectivos totalizadores R-2010, R-2020, R-2040, R-2050, R-2055 e R-2060;
  - R-4000: fechamento R-4099 e totalizadores por período/código de receita;
  - XMLs e registros de envio serão usados apenas como evidência e diagnóstico.
- Considerar válido o último fechamento de produção aceito, não excluído e com recibo. Se existir reabertura posterior, ausência de fechamento ou erro de transmissão, classificar o período como pendente e não declarar conformidade.
- Consultar a última DCTFWeb mensal por CNPJ e competência, decodificar o XML Base64 e considerar somente as origens `Reinf CP = 6` e `Reinf RET = 7`.
- Normalizar os valores por:
  - CNPJ;
  - competência;
  - série REINF;
  - evento;
  - código de receita, quando disponível nos dois lados;
  - tipo de valor: base, devido, suspenso, dedução, retenção e saldo exigível.
- Comparar primeiro o total por origem e depois o detalhamento por código. A igualdade será exigida em centavos; diferença a partir de R$ 0,01 será divergência.
- Quando um código não existir em um dos lados, registrar “somente no Domínio” ou “somente na DCTFWeb”. Detalhes sem chave equivalente serão exibidos como “não comparáveis”, nunca como conformes.
- Guardar histórico em SQLite com execução, empresa, competência, recibos, valores normalizados, diferenças, estado e hashes. XMLs fiscais brutos permanecerão apenas em memória.
- Processar empresas independentemente: falha de uma empresa não interromperá o lote.
- Antes do lote, mostrar a quantidade estimada de chamadas ao SERPRO e exigir confirmação, pois as consultas podem ser tarifadas.

## Interfaces e resultado

- Painel com filtros de competência, empresa, série, evento, código de receita e situação.
- Indicadores: conformes, divergentes, pendentes de fechamento, sem DCTFWeb e com erro.
- Detalhamento por empresa com valor Domínio, valor DCTFWeb, diferença, fechamento utilizado e recibos.
- Excel com abas `Resumo`, `Divergências`, `Detalhes`, `Pendências`, `Erros` e `Metadados`.
- Execução por comandos:
  - `streamlit run app.py`;
  - `python -m src.cli compare --competencia AAAA-MM --empresa CODIGO`;
  - `python -m src.cli batch --competencia AAAA-MM`.
- Configuração por variáveis de ambiente para DSN, usuário somente leitura, credenciais SERPRO, PFX, senha e CNPJ contratante. Segredos e tokens não serão gravados ou exibidos.
- O cliente SERPRO reutilizará tokens, renovará após `401`, respeitará `429` e fará repetição limitada apenas das consultas seguras.
- Não serão usados os serviços de relatório de débito/crédito que aparecem no catálogo SERPRO sem contrato público publicado.

## Testes e aceitação

- Testar seleção do último fechamento válido, retificação, exclusão, reabertura, ausência de movimento e fechamento ausente.
- Testar cálculos de contribuição, retenção, adicional, dedução, suspensão e saldo exigível.
- Testar XML DCTFWeb com namespaces, JSON escapado, Base64, códigos de origem e leiaute desconhecido.
- Testar divergência de R$ 0,01, códigos presentes em apenas uma fonte e totais iguais com detalhes diferentes.
- Testar autenticação e falhas HTTP com transporte simulado, sem chamadas reais nos testes automatizados.
- Confirmar que todas as consultas ao Domínio são `SELECT` e que nenhum XML bruto ou segredo entra no SQLite, Excel ou logs.
- Homologar com cinco casos reais controlados: R-2000, R-4000, ambas as séries, sem movimento e com retificação.
- A versão será aceita quando os cinco casos coincidirem com uma conferência manual e nenhum período incompleto puder aparecer como conforme.

## Premissas

- O painel será local/interno, seguindo o padrão Streamlit já existente no repositório.
- O banco `Contabil Oficial` será acessado pelo usuário `EXTERNO`, exclusivamente para leitura.
- A empresa será relacionada pelo `CODI_EMP` e pelo CNPJ de `GEEMPRE`.
- A procuração e-CAC `00103` e o contrato Integra Contador estarão disponíveis para os contribuintes consultados.
- O primeiro escopo cobre valores e divergências das séries R-2000 e R-4000, após fechamentos aceitos.
- Não haverá agendamento automático, correção de lançamentos, transmissão da DCTFWeb ou emissão de DARF nesta versão.
