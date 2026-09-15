---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ccc4757e5e8f1ecd8caa40508fc6a6f9e7677e4cfa0aa7e835c1c2e6d326c8f4"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/regime/mensagens/).

# Mensagens específicas para o Integra Simples Nacional - REGIME

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Erro-REGIME-MSG_ISN_001] | Erro ao utilizar o Integra Contador SN. Tente novamente mais tarde. | Erro interno. Efetuar nova tentativa. |
| [EntradaIncorreta-REGIME-MSG_ISN_049] | O campo descritivoRegime deve ter uma das duas entradas: COMPETENCIA ou CAIXA. | Deve ser enviado o texto para o regime escolhido |
| [EntradaIncorreta-REGIME-MSG_ISN_050] | O campo anoOpcao é anterior ao ano de abertura da empresa. | O campo anoOpcao passado não é válido de acordo com a data de abertura. |
| [EntradaIncorreta-REGIME-MSG_ISN_051] | O campo deAcordoResolucao está ausente ou false. Não será efetivada a opção de regime até que ele seja enviado como true. | Reenviar o valor como true. |
| [Aviso-REGIME-MSG_ISN_052] | Opção pelo regime de apuração de receitas já realizada. | A opção já foi realizada. |
| [EntradaIncorreta-REGIME-MSG_ISN_053] | O campo descritivoRegime está como {0} mas o tipoRegime está como {1}. | O valor enviado no descritivoRegime não está coerente com o campo tipoRegime |
| [Sucesso-REGIME-MSG_ISN_054] | Opção pelo regime de apuração de receitas realizada com sucesso. | A opção foi efetivada. |
| [Aviso-REGIME-MSG_ISN_055] | Não foram encontradas opções efetivadas para este CNPJ. | A consulta não achou opções para este CNPJ |
| [EntradaIncorreta-REGIME-MSG_ISN_056] | Ano Calendário deve estar entre {0} e {1}. | O parâmetro anoCalendario está fora dos limites de acordo com a regra do Sistema. |
| [Aviso-REGIME-MSG_ISN_057] | Não foi encontrada opção de regime para o ano informado. | O ano consultado não possui regime efetivado. |
| [EntradaIncorreta-REGIME-MSG_ISN_058] | Não foi informado o parâmetro {0}. | Um parâmetro necessário não foi enviado. |
| [EntradaIncorreta-REGIME-MSG_ISN_059] | Campo anoOpcao deve ter 4 dígitos numéricos e estar entre {0} e {1}. | Parâmetro enviado incorretamente. |
| [EntradaIncorreta-REGIME-MSG_ISN_060] | O campo tipoRegime deve ser 0 ou 1. | Parâmetro enviado incorretamente. |
