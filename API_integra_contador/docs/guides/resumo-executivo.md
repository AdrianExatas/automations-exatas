# API Integra Contador — resumo para liderança

> Visão resumida baseada na documentação oficial do SERPRO, coletada em 14 de setembro de 2026.

## O que é

A API Integra Contador permite integrar sistemas empresariais a serviços fiscais do SERPRO. Ela pode reduzir atividades manuais hoje realizadas em portais governamentais, trazendo informações, documentos e algumas operações fiscais para uma plataforma própria.

## O que podemos desenvolver

| Solução | Possibilidades principais |
|---|---|
| Painel fiscal de clientes | Reunir obrigações, declarações, recibos, pagamentos, parcelamentos e situação fiscal |
| Central de alertas | Monitorar Caixa Postal, DTE, eventos cadastrais e mudanças de situação |
| Automação do Simples Nacional | Consultar e transmitir PGDAS-D e DEFIS, além de emitir DAS |
| Esteira DCTFWeb e MIT | Consultar declarações, recibos e XML, transmitir, encerrar apurações e emitir DARF |
| Portal do MEI | Emitir certificados e DAS, consultar situação, declaração anual, benefício e dívida ativa |
| Gestor de parcelamentos | Consultar acordos e parcelas, acompanhar pagamentos e emitir documentos |
| Conciliação fiscal | Consultar pagamentos, emitir comprovantes e cruzar informações com guias e obrigações |
| Monitor de regularidade | Solicitar situação fiscal, organizar pendências e acompanhar processos disponíveis |

## Benefícios esperados

- menos acessos e consultas manuais a portais;
- redução do tempo gasto em tarefas repetitivas;
- menor risco de perda de mensagens e prazos;
- atendimento mais rápido e padronizado;
- melhor rastreabilidade das consultas, documentos e transmissões;
- capacidade de atender uma carteira maior sem crescimento proporcional da operação.

## Recomendação

Começar por um **Painel de Pendências, Obrigações e Guias**, com consultas e alertas. Depois, incluir emissão assistida de documentos e, por último, transmissões e alterações fiscais.

1. **Consultar e monitorar:** menor risco e retorno mais rápido.
2. **Gerar documentos:** usar aprovação humana antes da entrega ou pagamento.
3. **Transmitir e alterar:** aplicar dupla conferência, auditoria e reconciliação.

## Pontos de atenção

- são necessários contrato com o SERPRO, certificado digital e credenciais;
- a atuação em nome de clientes pode exigir procurações específicas;
- há custos por consumo que precisam entrar no business case;
- dados e documentos fiscais exigem controles de segurança e LGPD;
- a API não cobre necessariamente tudo o que existe nos portais;
- alguns serviços aparecem no catálogo, mas ainda não têm contrato técnico público;
- transmissões não devem ser repetidas automaticamente após uma falha de resultado incerto.

## Decisão sugerida

Autorizar um piloto de 60 a 90 dias com uma carteira controlada, priorizando consultas e monitoramento. O piloto deve medir tempo economizado, acessos manuais evitados, alertas identificados, cobertura de procurações, falhas e custo por cliente.

Para detalhes, consulte a [visão executiva completa](visao-executiva.md) e o [índice oficial de serviços](../SERVICE_INDEX.md).
