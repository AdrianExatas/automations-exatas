# Plano de Ação: Reformulação Visual, UX e Organização da Interface (Design-Taste-Frontend)

Este plano estabelece a modernização visual e de experiência do usuário (UX) do **Painel de Conferência Fiscal 360° (Integra Contador × Domínio)**, aplicando integralmente as diretrizes da skill [`design-taste-frontend`](file:///c:/Users/Exatas/Documents/GitHub/automations-exatas/API_integra_contador/.agents/skills/design-taste-frontend/SKILL.md).

O objetivo é transformar a interface atual em uma **estação de trabalho fiscal executiva de alta performance**, agradável, intuitiva, com acabamento institucional refinado (nível Vercel/Linear), navegação fluida e foco na produtividade da equipe da Exatas Contabilidade.

---

## 1. Diagnóstico da Interface Atual

| Área | Estado Atual | Oportunidade com `design-taste-frontend` |
| :--- | :--- | :--- |
| **Navegação** | 9 abas horizontais planas acumuladas, gerando sobrecarga cognitiva. | Agrupamento em **3 Núcleos de Trabalho** claros ou barra de navegação com categorização e badges reativos. |
| **Hierarquia Visual** | Cartões KPI com caixas repetitivas e bordas genéricas. | Padrão **Bento Grid 2.0**: cartões com pesos assimétricos, sombras de difusão, refração em vidro fosco e sem poluição de linhas. |
| **Tabelas de Dados** | Cabeçalhos sem fixação fluida; linhas densas sem feedback de foco. | **Sticky Header com blur**, linhas com realce suave ao passar o cursor, alinhamento numérico tabular rígido (`font-mono tabular-nums`). |
| **Ações por Empresa** | Múltiplos botões pequenos espremidos na coluna "Ações" de cada tabela. | **Menu de Ações Rápidas (Slide-over / Action Dropdown)**: centraliza "Emitir DARF", "Dossiê Obsidian", "Kit Mensal" e "Auditar" com 1 clique limpo. |
| **Estados de Carregamento** | Overlay escuro bloqueante que cobre a tela toda. | **Skeleton Loaders** que mantêm o layout no lugar enquanto os dados são carregados, sem "piscar" a tela. |
| **Busca & Filtros** | Barra de busca isolada por aba. | **Busca Global Instantânea (Command Bar)**: localiza qualquer empresa por CNPJ ou Razão Social imediatamente com atalho rápido (`Ctrl + K`). |

---

## 2. Pilares de Design Adotados (da Skill)

1. **Tipografia Determinística:** Família **`Outfit`** para display e títulos (pesos 400, 500, 600, 700) com **`JetBrains Mono`** (`tabular-nums`) para todos os valores monetários, recibos e identificadores fiscais.
2. **Paleta Calibrada (Zero Lilás / Zero AI Glow):**
   - Fundo base: Charcoal/Slate ultra-profundo (`#080C14` / `#0D1322`).
   - Superfície dos cartões: Vidro fosco sutil com refração interna (`background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.07)`).
   - Acento Único: Electric Blue (`#38BDF8`) com sinais de estado em Emerald (`#10B981`) para regularidade e Warm Amber (`#F59E0B`) para pendências.
3. **Política Anti-Emoji Rigorosa:** Ícones exclusivamente em vetores SVG geométricos com espessura uniforme (`1.75px`).
4. **Física Tátil & Micro-interações:** Transições suaves de mola (`cubic-bezier(0.16, 1, 0.3, 1)`), compressão tátil ao clicar (`transform: translateY(1px) scale(0.985)`).

---

## 3. Detalhamento do Plano de Ação por Fases

### Fase 1: Arquitetura de Informação e Navegação Reorganizada
* **Agrupamento dos 9 Módulos em 3 Categorias de Trabalho:**
  1. **📊 Declarações & Apurações:** Conferência DCTFWeb, Simples Nacional (PGDAS-D), MEI Expresso.
  2. **🛡️ Regularidade & Auditoria:** Situação Fiscal (CND), Parcelamentos Federais & PGFN, Procurações RFB.
  3. **📬 Comunicação & Guias:** Caixa Postal Fiscal (DTE), Pagamentos Arrecadados, Calculadora Sicalc.
* **Barra de Navegação Superior Refinada:**
  - Seletor de categoria com transição animada.
  - Badges reativos com contagem de alertas (ex: CNDs com pendência, mensagens não lidas, procurações a vencer).
  - Indicador de status do Domínio e da rede LAN integrado de forma discreta e elegante.

### Fase 2: Bento Grid 2.0 e Redesenho dos Painéis de KPI
* **Reestruturação dos Cartões de Métricas:**
  - Redesenho com hierarquia clara: número em destaque (`text-3xl font-bold font-mono`), rótulo descritivo com tracking ajustado, e barra de progresso / micro-gráfico visual de conformidade.
  - Eliminação de caixas desnecessárias, permitindo que as informações "respirem" (aplicando *Visual Density = 5*).
  - Hover states com elevação suave de 2px e refração de borda iluminada.

### Fase 3: Experiência da Tabela de Conferência e Busca Unificada
* **Tabela Fiscal Executiva:**
  - **Sticky Header translúcido:** O cabeçalho da tabela fixa no topo da rolagem com efeito de vidro fosco (`backdrop-filter`).
  - **Filtros em Pílulas Redesenhados:** Pílulas com contadores numéricos estilizados e estados ativos com preenchimento calibrado.
  - **Alinhamento Numérico Perfeito:** Colunas de Domínio, DCTFWeb e Diferença alinhadas à direita com tipografia mono tabular para permitir conferência visual instantânea coluna por coluna.
  - **Accordion de Detalhamento:** Animação de expansão suave ao clicar numa empresa divergente, revelando a decomposição exata dos débitos (Origem 6 - Reinf CP vs Origem 7 - Reinf IR/CSLL/PIS/COFINS).

### Fase 4: Drawer Lateral de Ações Rápidas (Eliminação de Poluição Visual)
* Substituir os múltiplos botões individuais da tabela por um **Menu / Drawer de Ações Fiscais 360°**:
  - Ao clicar na linha da empresa, um painel lateral fluido desliza da direita com o **Perfil Fiscal 360° da Empresa**:
    - Status cadastral e regime tributário.
    - Botão direto para **Emitir DARF DCTFWeb**.
    - Botão direto para **Compilar Kit Mensal de Guias**.
    - Botão direto para **Gerar Dossiê Markdown no Obsidian**.
    - Histórico de conciliações anteriores salvas no SQLite.
  - Isso deixa a tabela principal limpa, rápida e fácil de ler.

### Fase 5: Estados de Carregamento e Telas de Vazio (Empty States)
* **Substituição do overlay bloqueante por Skeleton Loaders:** Ao trocar de competência ou filtrar, as linhas da tabela exibem um efeito de shimmer suave em vez de travar o usuário com tela preta.
* **Telas de Vazio Produtivas:** Quando não houver pendências ou divergências, exibir ilustrações vetoriais limpas com mensagem positiva e instrução do próximo passo (ex: *"Tudo em ordem nesta competência. Deseja exportar o relatório consolidado para o Excel?"*).

---

## 4. Arquivos Impactados

| Arquivo | Natureza da Modificação |
| :--- | :--- |
| [`index.html`](file:///c:/Users/Exatas/Documents/GitHub/automations-exatas/API_integra_contador/Dominio/reinf-dctfweb-conferencia/src/ui/public/index.html) | Reestruturação da barra de abas em categorias, novo layout Bento para KPIs, gaveta lateral (Drawer) de ações rápidas e barra de comando. |
| [`style.css`](file:///c:/Users/Exatas/Documents/GitHub/automations-exatas/API_integra_contador/Dominio/reinf-dctfweb-conferencia/src/ui/public/style.css) | Sistema de tokens e variáveis (Outfit, mono tabular, liquid glass, sombras de difusão, animações de gaveta e skeletons). |
| [`app.js`](file:///c:/Users/Exatas/Documents/GitHub/automations-exatas/API_integra_contador/Dominio/reinf-dctfweb-conferencia/src/ui/public/app.js) | Lógica de navegação por categorias, controle do Drawer de Perfil 360°, busca universal e renderização dos skeletons. |

---

## 5. Plano de Verificação

### Testes Automatizados
- Executar `bun test` para garantir que todas as 59 asserções de backend, rotas e regras fiscais permaneçam 100% íntegras.

### Verificação Visual & Interativa
- Testar a responsividade em viewports de notebook (1366×768) e desktop full HD (1920×1080).
- Validar abertura instantânea de todos os 10 modais e do novo Drawer de ações.
- Conferir ausência total de emojis residuais e consistência visual dos vetores SVG.
- Testar a navegação fluida entre os 3 núcleos de trabalho e o filtro de empresas inativas.
