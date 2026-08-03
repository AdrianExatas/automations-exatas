---
name: gerar-pop-it
description: Gera documentos editáveis de processos POP/PR, IT/IN, FORM e MP a partir de vídeos, transcrições ou informações fornecidas, usando modelos locais e Microsoft Word/Excel. Use quando for preciso documentar um processo em português, escolher quais dos quatro documentos produzir, criar campos manuais para prints, validar correspondência entre documentos ou adaptar um JSON legado sem inserir capturas automaticamente.
---

# Gerar POP, IT, FORM e MP

## Fluxo de trabalho

1. Defina a seleção uma única vez.
   - Se o pedido ainda não disser quais documentos gerar, pergunte no início: `Quais documentos devo gerar: POP/PR, IT/IN, FORM e/ou MP?`
   - Registre a resposta em `documentos_solicitados`. Não repita a pergunta durante a execução.

2. Analise a fonte sem produzir prints finais.
   - Para vídeo, execute `scripts/inspect_video.ps1 -VideoPath <video> -OutputJson <temporario.json> -KeepWorkspace`, leia no resultado o `contact-sheet.jpg` e os frames necessários e, em um bloco `finally`, execute `scripts/inspect_video.ps1 -CleanupWorkspace <workspace_path>`. Os frames servem apenas à compreensão e nunca podem permanecer após a análise.
   - Execute `scripts/transcribe_video.ps1 -VideoPath <video> -OutputPath <temporario.txt> -ResultJson <temporario.json>` quando a fala puder esclarecer as ações. Depois de transferir somente os fatos necessários ao JSON v2, elimine esses dois arquivos temporários em `finally`.
   - Se áudio, transcrição ou entendimento forem insuficientes, continue e registre a lacuna em `pontos_validacao`. Nunca complete uma regra por suposição.
   - Não extraia, trate, procure, valide ou anexe screenshots aos documentos.

3. Escreva um JSON v2.
   - Leia `references/padrao-documental.md` e valide a estrutura com `references/content-v2.schema.json`.
   - Use IDs de etapa estáveis e mantenha as referências entre POP, IT, FORM e MP.
   - No `campo_print` da IT, descreva a tela que o usuário deverá inserir manualmente. Não informe caminho de arquivo de imagem.
   - Quando o FORM não vier definido, derive perguntas verificáveis das instruções da IT.
   - Riscos apenas plausíveis devem usar `sugerido: true`, P/G vazios e uma pendência de revisão.

4. Gere e valide em uma única chamada.

   ```powershell
   powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
     -File scripts/build_documents.ps1 `
     -ContentJson <conteudo.json> `
     -OutputDir <pasta-de-saida>
   ```

   O orquestrador normaliza JSONs legados, gera em staging, fecha Word/Excel, valida e só então promove os arquivos. Entregue apenas os documentos selecionados, `relatorio-validacao.md` e, quando necessária, `pendencias-validacao.md`.

5. Faça a revisão humana final.
   - Abra os arquivos no Word/Excel sem reparo.
   - Na IT, clique em cada controle de imagem e confirme a substituição manual por uma figura de teste, sem alterar a estabilidade do layout.
   - No FORM, teste respostas vazias, parciais, `SIM` e `NÃO`.
   - No MP, teste P/G vazios e preenchidos e confira a classificação calculada.

## Regras de conteúdo

- Escreva em português, com objetividade suficiente para executar a tarefa sem conhecimento implícito.
- POP: tabela cronológica curta `O QUE / COMO / SETOR / REGISTRO`.
- IT: somente título da etapa, caminho conhecido, ações numeradas e alertas indispensáveis. Não acrescente público-alvo, glossário, objetivos, “quando usar” ou resultados repetidos.
- Após etapa visualmente relevante da IT: um campo Word de imagem clicável 16:9, identificado pela etapa, com orientação e legenda para inserção manual.
- FORM: contexto configurável, perguntas `SIM/NÃO`, respostas inicialmente vazias, parecer `PENDENTE` enquanto houver lacuna, depois `CONFORME` ou `NÃO CONFORME`, percentual sem divisão por zero e área `EVIDÊNCIA/PRINT — INSERÇÃO MANUAL` por bloco.
- MP: cadeia fornecedor–entrada–cliente–saída, fluxo das macroetapas e múltiplos riscos. P e G ficam vazios para riscos sugeridos. Calcule `P×G` somente após ambos; classifique 1–4 como tolerável, 5–10 como ALARP e 12 ou mais como inaceitável.
- Mitigações e indicadores só podem ser afirmados quando sustentados pela fonte. Caso contrário, deixe-os vazios e registre pendência.
- Use `Ponto para validação: ...` para código, setor, responsável, prazo, caminho, regra ou resultado não confirmado.

## Compatibilidade

- Aceite JSON legado. Normalize `paragrafos` e `passo_a_passo` para `instrucoes`.
- Use `print_id` e `prints[]` somente para criar o controle manual e recuperar a legenda.
- Ignore timestamp, arquivo de imagem e redactions legados. Nenhum campo legado pode reativar inserção automática.

## Recursos

- `references/padrao-documental.md`: estrutura, contrato e critérios documentais.
- `references/content-v2.schema.json`: esquema do JSON compartilhado.
- `scripts/build_documents.ps1`: orquestra geração e validação.
- `scripts/normalize_content.ps1`: adapta JSON v2 ou legado.
- `scripts/inspect_video.ps1`: inspeciona vídeo com ferramentas portáteis e apaga os frames temporários.
- `scripts/transcribe_video.ps1`: transcreve áudio localmente e registra contingências.
- `scripts/validate_documents.ps1`: valida Word e Excel via Office desktop.
- `assets/templates/`: modelos internos sanitizados dos quatro documentos.
