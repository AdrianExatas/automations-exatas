---
name: gerar-pop-it
description: Gera documentos editáveis de processos POP/PR, IT/IN, FORM e MP a partir de uma transcrição fornecida, usando modelos locais e Microsoft Word/Excel. Use quando for preciso documentar um processo em português a partir do texto da transcrição, escolher quais dos quatro documentos produzir, criar campos manuais para prints, atualizar a Lista Documental Mestra, validar correspondência entre documentos ou adaptar um JSON legado sem inserir capturas automaticamente.
---

# Gerar POP, IT, FORM e MP

## Fluxo de trabalho

1. Defina a seleção uma única vez.
   - Se o pedido ainda não disser quais documentos gerar, pergunte no início: `Quais documentos devo gerar: POP/PR, IT/IN, FORM e/ou MP?`
   - Registre a resposta em `documentos_solicitados`. Não repita a pergunta durante a execução.

2. Colete o brief mínimo de metadados (uma rodada, junto da seleção ou logo após).
   - Pergunte só o que a transcrição quase nunca traz e a operação precisa:
     - setor / sigla e códigos oficiais (ou “ainda não definidos”)
     - elaborador / verificador / aprovador (ou pendência única)
     - nome oficial do sistema interno e da planilha/registro de saída
     - prazo padrão da tarefa, se houver
     - papéis: quem executa / quem comunica ao cliente
   - Não invente esses dados. Ausências viram `pontos_validacao` **agrupados**.

3. Receba a transcrição.
   - A entrada obrigatória é a transcrição do processo (texto no chat ou arquivo `.txt`/`.md`).
   - Extraia etapas, ações, caminhos de sistema, registros, decisões/ramos e riscos somente do texto e do brief.
   - Se algum dado não estiver confirmado, continue e registre a lacuna em `pontos_validacao`. Nunca complete uma regra por suposição.
   - Não capture, procure, valide ou anexe screenshots aos documentos.

4. Escreva um JSON v2 com qualidade operacional.
   - Leia `references/padrao-documental.md` e `references/rubrica-qualidade.md` **antes** de fechar o conteúdo.
   - Use `../../referencias/` (exemplos PR/IN/FORM/MP e fundamentos) só como espelho de estilo e completude — não como entrada.
   - Salve em `output/<processo>/geracao/content-v2.json` (não misture com os entregáveis finais).
   - Valide a estrutura com `references/content-v2.schema.json`.
   - Use IDs de etapa estáveis e mantenha as referências entre POP, IT, FORM e MP.
   - Defina `transcricao.status` como `fornecida` e `transcricao.idioma` como `pt` (ou o idioma real do texto).
   - No `campo_print` da IT, descreva a tela que o usuário deverá inserir manualmente. Não informe caminho de arquivo de imagem. Oriente a evitar credenciais e dados de outro cliente.
   - Quando o FORM não vier definido, derive perguntas verificáveis (auditáveis) das instruções da IT.
   - Riscos apenas plausíveis devem usar `sugerido: true`, P/G vazios e uma pendência agrupada de revisão de P/G.
   - Preencha `lista_mestra.entradas[]` para cada documento solicitado (ou deixe a normalização derivá-las).

5. Rode o gate semântico antes do build.

   ```powershell
   python "scripts/validate_content_quality.py" `
     --content-json "output/<processo>/geracao/content-v2.json" `
     --report-path "output/<processo>/geracao/relatorio-qualidade.md"
   ```

   Corrija falhas de conteúdo (cobertura, FORM, objetivo/resultado, lista mestra) antes de gerar Office. Avisos podem seguir com pendência explícita.

6. Gere e valide em uma única chamada.

   ```powershell
   powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
     -File scripts/build_documents.ps1 `
     -ContentJson <conteudo.json> `
     -OutputDir <pasta-de-saida>
   ```

   O orquestrador normaliza JSONs legados, gera em staging, fecha Word/Excel, atualiza a Lista Documental Mestra, valida e só então promove os arquivos na pasta de saída:

   ```
   output/<processo>/
     documentos/   # entregáveis finais (.docx / .xlsx) + FORM.QUA.003 da mestra do pacote
     geracao/      # JSON de conteúdo, normalizado, relatórios e pendências
   ```

   Em `documentos/` ficam os arquivos selecionados e a lista mestra gerada/atualizada do pacote. Em `geracao/` ficam `content.normalized.json`, cópia do JSON de entrada, `relatorio-validacao.md`, `relatorio-qualidade.md` (se gerado), `lista-mestra-entradas.json` e, quando necessária, `pendencias-validacao.md`.

   Para mesclar em uma cópia de trabalho da mestra institucional (nunca sobrescrever `../../referencias/` sem cópia explícita):

   ```powershell
   powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
     -File scripts/build_documents.ps1 `
     -ContentJson <conteudo.json> `
     -OutputDir <pasta-de-saida> `
     -ListaMestraPath <copia-de-trabalho-FORM.QUA.003.xlsx>
   ```

7. Faça a revisão humana final.
   - Abra os arquivos no Word/Excel sem reparo.
   - Na IT, clique em cada controle de imagem e confirme a substituição manual por uma figura de teste, sem alterar a estabilidade do layout.
   - No FORM, teste respostas vazias, parciais, `SIM` e `NÃO`.
   - No MP, teste P/G vazios e preenchidos e confira a classificação calculada.
   - Confira se a Lista Mestra contém uma linha por documento gerado, sem duplicar códigos.

## Regras de conteúdo

- Escreva em português, com objetividade suficiente para executar a tarefa sem conhecimento implícito.
- POP: tabela cronológica curta `O QUE / COMO / SETOR / REGISTRO`; objetivo e resultado pretendido preenchidos.
- IT: somente título da etapa, caminho conhecido, ações numeradas e alertas indispensáveis. Documente ramos se/então da fonte. Não acrescente público-alvo, glossário, objetivos, “quando usar” ou resultados repetidos.
- Após etapa visualmente relevante da IT: um campo Word de imagem clicável 16:9, identificado pela etapa, com orientação e legenda para inserção manual.
- FORM: contexto configurável, perguntas `SIM/NÃO` auditáveis, respostas inicialmente vazias, parecer `PENDENTE` enquanto houver lacuna, depois `CONFORME` ou `NÃO CONFORME`, percentual sem divisão por zero e área `EVIDÊNCIA/PRINT — INSERÇÃO MANUAL` por bloco.
- MP: cadeia fornecedor–entrada–cliente–saída, fluxo das macroetapas e múltiplos riscos. P e G ficam vazios para riscos sugeridos. Calcule `P×G` somente após ambos; classifique 1–4 como tolerável, 5–10 como ALARP e 12 ou mais como inaceitável. Barreira preferencialmente aponta FORM/controle.
- Mitigações e indicadores só podem ser afirmados quando sustentados pela fonte. Caso contrário, deixe-os vazios e registre pendência.
- Use `Ponto para validação: ...` de forma agrupada para código, setor, responsáveis, prazo, caminho, regra ou resultado não confirmado.
- Lista mestra: uma entrada por documento gerado, origem `INTERNO`, tipo alinhado ao prefixo, procedimento raiz = PR do pacote quando existir.

## Compatibilidade

- Aceite JSON legado. Normalize `paragrafos` e `passo_a_passo` para `instrucoes`.
- Use `print_id` e `prints[]` somente para criar o controle manual e recuperar a legenda.
- Ignore timestamp, arquivo de imagem e redactions legados. Nenhum campo legado pode reativar inserção automática.

## Recursos

- `references/padrao-documental.md`: estrutura, contrato e critérios documentais.
- `references/rubrica-qualidade.md`: checklist de qualidade operacional e cobertura cruzada.
- `references/content-v2.schema.json`: esquema do JSON compartilhado.
- `scripts/build_documents.ps1`: orquestra geração, lista mestra e validação.
- `scripts/normalize_content.ps1`: adapta JSON v2 ou legado.
- `scripts/validate_content_quality.py`: gate semântico (cobertura, FORM, MP, lista mestra).
- `scripts/update_lista_mestra.py`: upsert na Lista Documental Mestra (FORM.QUA.003).
- `scripts/validate_documents_structural.ps1` / `validate_documents_structural.py`: valida ZIP/XML sem abrir Word/Excel.
- `scripts/repair_docx_encoding.py`: corrige caracteres quebrados (mojibake) em DOCX gerados via Word COM.
- `scripts/validate_documents.ps1`: validação alternativa via Office desktop (COM).
- `scripts/build_excel_openpyxl.py`: geração alternativa de FORM/MP sem Excel COM.
- `assets/templates/`: modelos internos sanitizados dos quatro documentos e da lista mestra.
- `../../referencias/` (raiz do projeto): exemplos opcionais de PR/IN/FORM/MP e FORM.QUA.003 para alinhar estilo e padrão; não são entrada do gerador.
