---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mensagens/"
sourceUpdatedAt: "25 de fevereiro de 2026 21:19:34 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "73857ff89fac9d89b4eae40a70219301cefaec4de5670f059c02a55ca1ab09a8"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mensagens/).

# Mensagens de negócio

## Eventos de última atualização

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Sucesso-EVENTOSATUALIZACAO-001] | Requisição efetuada com sucesso. | HTTP STATUS: 200 (OK) A requisição foi processada com sucesso. Nenhuma ação adicional necessária. |
| [EntradaIncorreta-EVENTOSATUALIZACAO-002] | Parâmetros de entrada inválidos. | HTTP STATUS: 400 (Bad Request) Verifique os dados de entrada informados. Certifique-se de que todos os campos obrigatórios estão preenchidos corretamente e seguem o formato esperado. |
| [Erro-EVENTOSATUALIZACAO-003] | Erro ao realizar consulta. | HTTP STATUS: 500 (Internal Server Error) Erro interno no processamento da consulta. Tente novamente após alguns instantes. Se o problema persistir, abra um acionamento técnico incluindo os dados da requisição. |
| [Aviso-EVENTOSATUALIZACAO-004] | O Contratante atingiu o limite máximo diário de requisições na consulta de eventos do tipo {eventId} para {pessoa física ou jurídica}. | HTTP STATUS: 429 (Too Many Requests) O limite diário de requisições foi atingido para este tipo de evento e pessoa (PF/PJ). Tente novamente após 00:00 (meia-noite), quando o contador será resetado. |
| [Aviso-EVENTOSATUALIZACAO-005] | {quantidade} requisições restantes para consultas de eventos do tipo {eventId} para {pessoa}. | HTTP STATUS: 200 (OK) ou 400 (Bad Request) Mensagem informativa retornada junto com outras respostas. Utilize para monitorar a quantidade de requisições disponíveis para o dia e planejar suas consultas. |
| [EntradaIncorreta-EVENTOSATUALIZACAO-006] | Nenhum dado encontrado para o protocolo {0} referente ao evento {1}. Verifique se o protocolo está correto. Caso os dados já tenham sido obtidos anteriormente, eles são removidos automaticamente. | HTTP STATUS: 400 (Bad Request) Possíveis causas: • Protocolo informado está incorreto ou não existe • Resultado já foi obtido anteriormente (dados são removidos após primeira consulta bem-sucedida) |
| [Aviso-EVENTOSATUALIZACAO-007] | Solicitação para o protocolo {0} em processamento. Tempo estimado: 1 minuto. Tente novamente em instantes. | HTTP STATUS: 202 (Accepted) A solicitação está sendo processada de forma assíncrona. O tempo estimado é baseado em métricas EMA e P90 do sistema. Ação: Aguarde o tempo estimado e realize polling usando o mesmo protocolo. Recomenda-se polling a cada 10-15 segundos. |
