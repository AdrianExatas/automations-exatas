---
name: gerar-pop-it
description: Gera documentos editáveis de processos POP/PR, IT/IN, FORM e MP a partir de uma transcrição fornecida (arquivo em disco, texto no chat ou pipeline automatizado vídeo→Whisper), usando modelos locais e Microsoft Word/Excel. Use quando for preciso documentar um processo em português a partir do texto da transcrição, escolher quais dos quatro documentos produzir, criar campos manuais para prints, atualizar a Lista Documental Mestra, validar correspondência entre documentos ou adaptar um JSON legado sem inserir capturas automaticamente.
---

# Gerar POP, IT, FORM e MP

## Fluxo de trabalho

1. Defina a seleção uma única vez.
   - Se o pedido ainda não disser quais documentos gerar **e não estiver em modo não interativo**, pergunte no início: `Quais documentos devo gerar: POP/PR, IT/IN, FORM e/ou MP?`
   - Se o pedido (ou o brief do orquestrador) já trouxer `documentos_solicitados` / lista explícita, **não pergunte**.
   - Registre a resposta em `documentos_solicitados`. Não repita a pergunta durante a execução.

2. Colete o brief mínimo de metadados (uma rodada, junto da seleção ou logo após).
   - Em **modo não interativo** (pedido do `gerar_de_midia.ps1` / `run_agent_gerar.py`, ou brief já no prompt): **não pergunte**; use o brief e marque lacunas em `pontos_validacao`.
   - Caso contrário, pergunte só o que a transcrição quase nunca traz e a operação precisa:
     - setor / sigla e códigos oficiais (ou “ainda não definidos”)
     - elaborador / verificador / aprovador (ou pendência única)
     - nome oficial do sistema interno e da planilha/registro de saída
     - prazo padrão da tarefa, se houver
     - papéis: quem executa / quem comunica ao cliente
   - Não invente esses dados. Ausências viram `pontos_validacao` **agrupados**.

3. Receba a transcrição.
   - A entrada obrigatória é a transcrição do processo: texto no chat, arquivo `.txt`/`.md` anexado, **ou caminho em disco** (ex.: `transcriptions/a fazer/...txt` / `transcriptions/feitos/...txt`).
   - Se o pedido indicar um caminho de arquivo, **leia o arquivo** em vez de pedir para colar o texto.
   - Extraia etapas, ações, caminhos de sistema, registros, decisões/ramos e riscos somente do texto e do brief.
   - Se algum dado não estiver confirmado, continue e registre a lacuna em `pontos_validacao`. Nunca complete uma regra por suposição.
   - Não capture, procure, valide ou anexe screenshots aos documentos.

4. Escreva um JSON v2 com qualidade operacional.
   - Leia `references/padrao-documental.md` e `references/rubrica-qualidade.md` **antes** de fechar o conteúdo.
   - Se `form` ou `mp` estiverem na seleção, leia também `references/mp-fidelidade.md` e `references/form-fidelidade.md` (contratos visuais/estruturais).
   - Se `pop` ou `it` estiverem na seleção, leia também `references/word-abertura.md` (abreviaturas e documentação complementar).
   - Use `../../referencias/` (exemplos PR/IN/FORM/MP e fundamentos) só como espelho de estilo e completude — não como entrada.
   - Salve em `output/<processo>/geracao/content-v2.json` (não misture com os entregáveis finais).
   - Valide a estrutura com `references/content-v2.schema.json`.
   - Use IDs de etapa estáveis e mantenha as referências entre POP, IT, FORM e MP.
   - Defina `transcricao.status` como `fornecida` e `transcricao.idioma` como `pt` (ou o idioma real do texto). Em `transcricao.observacao`, registre o nome do arquivo de transcrição quando houver.
   - No `campo_print` da IT, descreva a tela que o usuário deverá inserir manualmente. Não informe caminho de arquivo de imagem. Oriente a evitar credenciais e dados de outro cliente.
   - Quando o FORM não vier definido, derive perguntas verificáveis (auditáveis) das instruções da IT.
   - Riscos apenas plausíveis devem usar `sugerido: true` e uma pendência agrupada de revisão de P/G. Deixe P/G ausentes no JSON: a normalização aplica o padrão (3 e 3 para sugeridos) para a classificação sair colorida como na referência.
   - Com MP na seleção: garanta `codigo_form`/`arquivo_form` (e IN/PR) no JSON — a BARREIRA do MP é montada só com esses títulos de documento, nunca com “Bloco B0x”. Preferir `documento.setor` na lista `01 - …` / `13 - …` de `mp-fidelidade.md` quando o setor for conhecido.
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

   O orquestrador normaliza JSONs legados, gera em staging, valida (estrutural + fidelidade FORM/MP) e promove os arquivos. **Não** gera `FORM.QUA.003` por padrão.

   FORM e MP são gerados por Python (`build_excel_openpyxl.py`), sem abrir o Excel: o Excel desktop sem ativação entra em funcionalidade reduzida e descarta mesclagens e formas ao salvar. **Não** use `-UseExcelCom` em geração normal nem em lote. Use `-UseExcelCom` só com Office ativado e pedido explícito. `-SkipMpFidelity` / `-SkipFormFidelity` são só para debug.

   ```
   output/<processo>/
     documentos/   # entregáveis finais (.docx / .xlsx)
     geracao/      # JSON de conteúdo, normalizado, relatórios e pendências
   ```

   Em `documentos/` ficam os arquivos selecionados. Em `geracao/` ficam `content.normalized.json`, cópia do JSON de entrada, `relatorio-validacao.md`, `relatorio-qualidade.md` (se gerado) e, quando necessária, `pendencias-validacao.md`.

   Lista Documental Mestra só sob pedido explícito do usuário:
   - `-UpdateListaMestra` — gera/atualiza `FORM.QUA.003` do pacote em `documentos/`
   - `-ListaMestraPath <copia>` — mescla numa cópia de trabalho (nunca sobrescrever `../../referencias/` sem cópia explícita)
   - `-SkipListaMestra` — força omitir mesmo se os flags acima forem passados

   ```powershell
   powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
     -File scripts/build_documents.ps1 `
     -ContentJson <conteudo.json> `
     -OutputDir <pasta-de-saida> `
     -UpdateListaMestra
   ```

   Lote (vários processos, com o mesmo gate de fidelidade MP):

   ```powershell
   powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
     -File scripts/build_lote.ps1 `
     -InputRoot "output/<data>" `
     -OutputRoot "output/<data>"
   ```

7. Faça a revisão humana final.
   - Abra os arquivos no Word/Excel sem reparo.
   - No PR/IN: abreviaturas com texto real (nunca `System.String[]`); documentação complementar em `CODIGO - Titulo;`, sem o próprio documento (`word-abertura.md`).
   - Na IT, clique em cada controle de imagem e confirme a substituição manual por uma figura de teste, sem alterar a estabilidade do layout.
   - No FORM: logo + 11 comentários; respostas vazias/parciais/`SIM`/`NÃO`; `C9`/`F8`/`E8` e coeficientes coerentes; sem reparo do Excel. O build já rodou `compare_form_fidelity.py` salvo `-SkipFormFidelity`.
   - No MP: confira BARREIRA (FORM+IN+PR uma vez), merges E/J, dropdown DEPART. (C3), classificação colorida e legenda `MUITO GRAVE` em E70. O build já rodou `compare_mp_fidelity.py` salvo `-SkipMpFidelity`.
   - Se a lista mestra foi solicitada, confira uma linha por documento gerado, sem duplicar códigos.

## Pipeline automatizado (vídeo → documentos)

Orquestração na raiz do projeto (sem colar o `.txt` no chat):

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File ".\skills\gerar-pop-it\scripts\gerar_de_midia.ps1" `
  -MediaPath ".\videos\processo.mp4" `
  -DocumentTypes pop,it,form,mp
```

- STT local: `scripts/transcribe_media.py` (faster-whisper / `large-v3-turbo`) → `transcriptions/a fazer/`.
- Geração: `scripts/run_agent_gerar.py` (Cursor SDK local) segue esta skill em modo não interativo e chama `build_documents.ps1`.
- Requisitos: Python + `pip install -r skills/gerar-pop-it/scripts/requirements-transcribe.txt`, ffmpeg no PATH, Word/Excel; para o agente automatizado, `CURSOR_API_KEY` e `pip install cursor-sdk`.
- Sem a chave: o STT roda e o script imprime o prompt para colar no chat.

## Regras de conteúdo

- Escreva em português, com objetividade suficiente para executar a tarefa sem conhecimento implícito.
- Texto **universal**: sem nomes de empresa/cliente do vídeo, sem “na fonte”, “exemplo demonstrativo”, “no vídeo” ou “na gravação”. Prefira “empresa da execução” / “contribuinte da tarefa”. Detalhes só da demo → `pontos_validacao`.
- POP: tabela cronológica curta `O QUE / COMO / SETOR / REGISTRO`; objetivo e resultado pretendido preenchidos; abertura conforme `word-abertura.md`.
- IT: somente título da etapa, caminho conhecido, ações numeradas e alertas indispensáveis. Documente ramos se/então da fonte. Não acrescente público-alvo, glossário, objetivos, “quando usar” ou resultados repetidos. Abertura conforme `word-abertura.md`.
- Após etapa visualmente relevante da IT: um campo Word de imagem clicável 16:9, identificado pela etapa, com orientação e legenda para inserção manual.
- FORM: layout institucional FORM.QUA.002 (cabeçalho/logo, coeficiente, resumo, blocos com `Coeficiente Parcial` e `Parecer Inspeção`), perguntas `SIM/NÃO` auditáveis, respostas inicialmente vazias, parecer iniciando em `NÃO CONFORME`, rodapé com `OBSERVAÇÃO` e assinaturas (`form-fidelidade.md`).
- MP: cadeia fornecedor–entrada–cliente–saída, fluxo das macroetapas e múltiplos riscos. P e G ausentes recebem o padrão da normalização (3 e 3 em risco sugerido, 2 e 3 nos demais) e continuam pendentes de revisão humana. `P×G` classifica 1–4 como tolerável, 5–10 como ALARP e 12 ou mais como inaceitável. BARREIRA mesclada = títulos FORM+IN+PR do pacote (não Bloco B0x); RESULTADO mesclado; Mitigação por linha; DEPART. na lista 01–13 (`mp-fidelidade.md`).
- Mitigações e indicadores só podem ser afirmados quando sustentados pela fonte. Caso contrário, deixe-os vazios e registre pendência.
- Use `Ponto para validação: ...` de forma agrupada para código, setor, responsáveis, prazo, caminho, regra ou resultado não confirmado.
- Lista mestra (JSON): uma entrada por documento gerado, origem `INTERNO`, tipo alinhado ao prefixo, procedimento raiz = PR do pacote quando existir. Planilha `FORM.QUA.003` só com `-UpdateListaMestra` / `-ListaMestraPath`.

## Compatibilidade

- Aceite JSON legado. Normalize `paragrafos` e `passo_a_passo` para `instrucoes`.
- Use `print_id` e `prints[]` somente para criar o controle manual e recuperar a legenda.
- Ignore timestamp, arquivo de imagem e redactions legados. Nenhum campo legado pode reativar inserção automática.

## Recursos

- `references/padrao-documental.md`: estrutura, contrato e critérios documentais.
- `references/mp-fidelidade.md`: contrato visual/estrutural do MP (obrigatório com MP).
- `references/form-fidelidade.md`: contrato visual/estrutural do FORM (obrigatório com FORM).
- `references/word-abertura.md`: abreviaturas e documentação complementar do PR/IN (obrigatório com POP/IT).
- `references/rubrica-qualidade.md`: checklist de qualidade operacional e cobertura cruzada.
- `references/content-v2.schema.json`: esquema do JSON compartilhado.
- `scripts/transcribe_media.py` / `transcribe_media.ps1`: STT local (faster-whisper).
- `scripts/gerar_de_midia.ps1`: orquestra vídeo/txt → agente → build.
- `scripts/run_agent_gerar.py`: agente Cursor local (modo não interativo).
- `scripts/build_documents.ps1`: orquestra geração e validação; lista mestra só com `-UpdateListaMestra` / `-ListaMestraPath`; fidelidade FORM/MP automática (salvo `-SkipFormFidelity` / `-SkipMpFidelity`).
- `scripts/build_lote.ps1`: geração em lote com o mesmo gate de fidelidade.
- `scripts/normalize_content.ps1`: adapta JSON v2 ou legado.
- `scripts/validate_content_quality.py`: gate semântico (cobertura, FORM, MP, lista mestra).
- `scripts/update_lista_mestra.py`: upsert na Lista Documental Mestra (FORM.QUA.003).
- `scripts/validate_documents_structural.ps1` / `validate_documents_structural.py`: valida ZIP/XML sem abrir Word/Excel.
- `scripts/repair_docx_encoding.py`: corrige caracteres quebrados (mojibake) em DOCX gerados via Word COM.
- `scripts/validate_documents.ps1`: validação alternativa via Office desktop (COM).
- `scripts/build_excel_openpyxl.py`: gerador padrão de FORM/MP sem Excel; FORM parte de `assets/templates/FORM-template.xlsx` e MP de `MP-template.xlsx` (formas DrawingML no XML).
- `scripts/sanitize_form_template.py`: regenera o template sanitizado a partir de `referencias/FORM.QUA.002`.
- `scripts/compare_form_fidelity.py`: regressão estrutural do FORM contra a referência (gate do build).
- `scripts/sanitize_mp_template.py`: regenera o template sanitizado a partir de `referencias/01.3 MP.FIS.001`.
- `scripts/compare_mp_fidelity.py`: regressão estrutural do MP contra a referência (gate do build).
- `scripts/build_excel_documents.ps1`: caminho opcional via Excel COM (`-UseExcelCom`), só com Office ativado — não usar em lote.
- `assets/templates/`: modelos internos sanitizados dos quatro documentos e da lista mestra.
- `../../referencias/` (raiz do projeto): exemplos opcionais de PR/IN/FORM/MP e FORM.QUA.003 para alinhar estilo e padrão; não são entrada do gerador.
