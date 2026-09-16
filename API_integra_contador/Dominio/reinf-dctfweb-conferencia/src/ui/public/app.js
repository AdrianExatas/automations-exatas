/**
 * Lógica da aplicação frontend para conciliação fiscal REINF × DCTFWeb × Domínio
 * e Módulos Integrados da API SERPRO Integra Contador 360°:
 * 1. Conferência DCTFWeb & Emissão de DARF
 * 2. Situação Fiscal & CND (RFB / PGFN)
 * 3. Caixa Postal Fiscal & DTE
 * 4. Pagamentos Arrecadados & Comprovantes
 * 5. Simples Nacional (PGDAS-D, DAS de Apuração, Extrato, DEFIS)
 * 6. Gestor de Parcelamentos Fiscais (PARCSN / PARCMEI)
 */

// Estado global da aplicação
const state = {
  activeTab: "dctfweb",
  activeHub: "apuracoes",
  competencia: "2026-08",
  dominioOverview: [],
  reconciledMap: new Map(), // codiEmp -> ReconciliationResult
  currentStatusFilter: "COM_MOVIMENTO",
  searchQuery: "",
  summary: null,
  expandedRows: new Set(),

  // Estados dos módulos
  sitfisMap: new Map(), // cnpj -> SitfisResult
  caixaMap: new Map(), // cnpj -> CaixaPostalResult
  pagamentosMap: new Map(), // cnpj -> PagamentosResult
  simplesMap: new Map(), // cnpj -> SimplesResult
  parcelamentosMap: new Map(), // cnpj -> ParcelamentoResult

  currentSitfisFilter: "ALL",
  currentCaixaFilter: "ALL",
  currentPagFilter: "ALL",
  currentSimplesFilter: "ALL",
  currentParcFilter: "ALL",
  currentProcFilter: "ALL",

  searchSitfisQuery: "",
  searchCaixaQuery: "",
  searchPagQuery: "",
  searchSimplesQuery: "",
  searchParcQuery: "",
  searchProcQuery: "",

  procuracoesMap: new Map(), // cnpj -> ProcuracaoResult
  workerPollInterval: null,
  pgfnList: [],
};

// Elementos do DOM
const dom = {
  compSelect: document.getElementById("compSelect"),
  btnLoadDominio: document.getElementById("btnLoadDominio"),
  btnEstimate: document.getElementById("btnEstimate"),
  btnRunBatch: document.getElementById("btnRunBatch"),
  btnExportExcel: document.getElementById("btnExportExcel"),
  searchInput: document.getElementById("searchInput"),
  tableBody: document.getElementById("tableBody"),

  // Status de Conexão
  dbStatusText: document.getElementById("dbStatusText"),

  // KPIs DCTFWeb
  valTotalEmpresas: document.getElementById("valTotalEmpresas"),
  valComMovimento: document.getElementById("valComMovimento"),
  valConformes: document.getElementById("valConformes"),
  valDivergentes: document.getElementById("valDivergentes"),
  valPendentes: document.getElementById("valPendentes"),
  valSemDctf: document.getElementById("valSemDctf"),

  // Totais Financeiros DCTFWeb
  finTotalDominio: document.getElementById("finTotalDominio"),
  finTotalDctfweb: document.getElementById("finTotalDctfweb"),
  finTotalDiferenca: document.getElementById("finTotalDiferenca"),

  // Contadores de Filtro DCTFWeb
  countComMov: document.getElementById("countComMov"),
  countSemMov: document.getElementById("countSemMov"),
  countAll: document.getElementById("countAll"),
  countConf: document.getElementById("countConf"),
  countDiv: document.getElementById("countDiv"),
  countPend: document.getElementById("countPend"),
  countSemDctf: document.getElementById("countSemDctf"),
  countInativas: document.getElementById("countInativas"),
  chkShowInactive: document.getElementById("chkShowInactive"),
  subTotalEmpresas: document.getElementById("subTotalEmpresas"),

  // Modais e Overlays
  estimateModal: document.getElementById("estimateModal"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  btnCancelEstimate: document.getElementById("btnCancelEstimate"),
  btnConfirmBatch: document.getElementById("btnConfirmBatch"),
  scopeMovimento: document.getElementById("scopeMovimento"),
  scopeFechamento: document.getElementById("scopeFechamento"),
  scopeTodas: document.getElementById("scopeTodas"),
  estCompetencia: document.getElementById("estCompetencia"),
  estMovimentoEmpresas: document.getElementById("estMovimentoEmpresas"),
  estFechamentoEmpresas: document.getElementById("estFechamentoEmpresas"),
  estTotalEmpresas: document.getElementById("estTotalEmpresas"),
  estTotalChamadas: document.getElementById("estTotalChamadas"),
  chkForceRefresh: document.getElementById("chkForceRefresh"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingText: document.getElementById("loadingText"),

  // Modal Caixa Postal
  caixaPostalModal: document.getElementById("caixaPostalModal"),
  btnCloseCaixaModal: document.getElementById("btnCloseCaixaModal"),
  btnCloseCaixaBtn: document.getElementById("btnCloseCaixaBtn"),
  caixaModalTitle: document.getElementById("caixaModalTitle"),
  caixaModalBody: document.getElementById("caixaModalBody"),

  // Modal Pagamentos
  pagamentosModal: document.getElementById("pagamentosModal"),
  btnClosePagamentosModal: document.getElementById("btnClosePagamentosModal"),
  btnClosePagamentosBtn: document.getElementById("btnClosePagamentosBtn"),
  pagamentosModalTitle: document.getElementById("pagamentosModalTitle"),
  pagamentosModalBody: document.getElementById("pagamentosModalBody"),

  // Modal Simples Nacional
  simplesModal: document.getElementById("simplesModal"),
  btnCloseSimplesModal: document.getElementById("btnCloseSimplesModal"),
  btnCloseSimplesBtn: document.getElementById("btnCloseSimplesBtn"),
  simplesModalTitle: document.getElementById("simplesModalTitle"),
  simplesModalBody: document.getElementById("simplesModalBody"),

  // Modal Parcelamentos
  parcelamentoModal: document.getElementById("parcelamentoModal"),
  btnCloseParcModal: document.getElementById("btnCloseParcModal"),
  btnCloseParcBtn: document.getElementById("btnCloseParcBtn"),
  parcModalTitle: document.getElementById("parcModalTitle"),
  parcModalBody: document.getElementById("parcModalBody"),

  // Situação Fiscal
  tableSitfisBody: document.getElementById("tableSitfisBody"),
  searchSitfisInput: document.getElementById("searchSitfisInput"),
  valSitfisTotal: document.getElementById("valSitfisTotal"),
  valSitfisRegular: document.getElementById("valSitfisRegular"),
  valSitfisPendencias: document.getElementById("valSitfisPendencias"),
  valSitfisProcessando: document.getElementById("valSitfisProcessando"),
  valSitfisNaoConsultadas: document.getElementById("valSitfisNaoConsultadas"),
  countSitfisAll: document.getElementById("countSitfisAll"),
  countSitfisReg: document.getElementById("countSitfisReg"),
  countSitfisPend: document.getElementById("countSitfisPend"),
  countSitfisProc: document.getElementById("countSitfisProc"),
  countSitfisNaoCons: document.getElementById("countSitfisNaoCons"),
  badgeSitfisCount: document.getElementById("badgeSitfisCount"),

  // Caixa Postal
  tableCaixaBody: document.getElementById("tableCaixaBody"),
  searchCaixaInput: document.getElementById("searchCaixaInput"),
  valCaixaTotal: document.getElementById("valCaixaTotal"),
  valCaixaNovas: document.getElementById("valCaixaNovas"),
  valCaixaTotalMsg: document.getElementById("valCaixaTotalMsg"),
  valCaixaEmDia: document.getElementById("valCaixaEmDia"),
  countCaixaAll: document.getElementById("countCaixaAll"),
  countCaixaNovas: document.getElementById("countCaixaNovas"),
  countCaixaEmDia: document.getElementById("countCaixaEmDia"),
  countCaixaNaoCons: document.getElementById("countCaixaNaoCons"),
  badgeCaixaPostalNovas: document.getElementById("badgeCaixaPostalNovas"),

  // Pagamentos
  tablePagBody: document.getElementById("tablePagBody"),
  searchPagInput: document.getElementById("searchPagInput"),
  valPagTotalEmpresas: document.getElementById("valPagTotalEmpresas"),
  valPagComPagamentos: document.getElementById("valPagComPagamentos"),
  valPagTotalValor: document.getElementById("valPagTotalValor"),
  valPagTotalGuias: document.getElementById("valPagTotalGuias"),
  countPagAll: document.getElementById("countPagAll"),
  countPagCom: document.getElementById("countPagCom"),
  countPagSem: document.getElementById("countPagSem"),
  countPagNaoCons: document.getElementById("countPagNaoCons"),
  badgePagamentosCount: document.getElementById("badgePagamentosCount"),

  // Simples Nacional
  tableSimplesBody: document.getElementById("tableSimplesBody"),
  searchSimplesInput: document.getElementById("searchSimplesInput"),
  valSimplesTotal: document.getElementById("valSimplesTotal"),
  valSimplesDeclaradas: document.getElementById("valSimplesDeclaradas"),
  valSimplesPagas: document.getElementById("valSimplesPagas"),
  valSimplesEmAberto: document.getElementById("valSimplesEmAberto"),
  valSimplesDefis: document.getElementById("valSimplesDefis"),
  countSimplesAll: document.getElementById("countSimplesAll"),
  countSimplesPago: document.getElementById("countSimplesPago"),
  countSimplesAberto: document.getElementById("countSimplesAberto"),
  countSimplesNaoCons: document.getElementById("countSimplesNaoCons"),
  badgeSimplesCount: document.getElementById("badgeSimplesCount"),

  // Parcelamentos
  tableParcBody: document.getElementById("tableParcBody"),
  searchParcInput: document.getElementById("searchParcInput"),
  valParcTotal: document.getElementById("valParcTotal"),
  valParcAtivos: document.getElementById("valParcAtivos"),
  valParcParcelas: document.getElementById("valParcParcelas"),
  valParcSemAcordo: document.getElementById("valParcSemAcordo"),
  countParcAll: document.getElementById("countParcAll"),
  countParcCom: document.getElementById("countParcCom"),
  countParcComParc: document.getElementById("countParcComParc"),
  countParcNaoCons: document.getElementById("countParcNaoCons"),
  badgeParcelamentosCount: document.getElementById("badgeParcelamentosCount"),

  // Parcelamentos PGFN
  valPgfnTotal: document.getElementById("valPgfnTotal"),
  valPgfnPagos: document.getElementById("valPgfnPagos"),
  valPgfnEmDia: document.getElementById("valPgfnEmDia"),
  valPgfnRisco: document.getElementById("valPgfnRisco"),
  tablePgfnBody: document.getElementById("tablePgfnBody"),
  novoAcordoPgfnModal: document.getElementById("novoAcordoPgfnModal"),
  pgfnId: document.getElementById("pgfnId"),
  pgfnEmpresaSelect: document.getElementById("pgfnEmpresaSelect"),
  pgfnNumeroNegociacao: document.getElementById("pgfnNumeroNegociacao"),
  pgfnModalidade: document.getElementById("pgfnModalidade"),
  pgfnValorParcela: document.getElementById("pgfnValorParcela"),
  pgfnDiaVencimento: document.getElementById("pgfnDiaVencimento"),
  pgfnCodigoReceita: document.getElementById("pgfnCodigoReceita"),
  pgfnObservacoes: document.getElementById("pgfnObservacoes"),

  // Worker Noturno
  btnRunWorker: document.getElementById("btnRunWorker"),
  workerStatusText: document.getElementById("workerStatusText"),
  workerModal: document.getElementById("workerModal"),
  btnCloseWorkerModal: document.getElementById("btnCloseWorkerModal"),
  btnCloseWorkerBtn: document.getElementById("btnCloseWorkerBtn"),
  btnTriggerWorkerNow: document.getElementById("btnTriggerWorkerNow"),
  btnTriggerWorkerAll: document.getElementById("btnTriggerWorkerAll"),
  workerProgressBar: document.getElementById("workerProgressBar"),
  workerStatusLabel: document.getElementById("workerStatusLabel"),
  workerProgressPercent: document.getElementById("workerProgressPercent"),
  workerNovasMsg: document.getElementById("workerNovasMsg"),
  workerProcCriticas: document.getElementById("workerProcCriticas"),
  workerPendenciasCnd: document.getElementById("workerPendenciasCnd"),

  // Procurações RFB
  valProcTotal: document.getElementById("valProcTotal"),
  valProcVigentes: document.getElementById("valProcVigentes"),
  valProcAlerta: document.getElementById("valProcAlerta"),
  valProcCritica: document.getElementById("valProcCritica"),
  countProcAll: document.getElementById("countProcAll"),
  countProcCritica: document.getElementById("countProcCritica"),
  countProcAlerta: document.getElementById("countProcAlerta"),
  countProcVigente: document.getElementById("countProcVigente"),
  countProcNaoCons: document.getElementById("countProcNaoCons"),
  badgeProcuracoesAlerta: document.getElementById("badgeProcuracoesAlerta"),
  searchProcInput: document.getElementById("searchProcInput"),
  tableProcBody: document.getElementById("tableProcBody"),
  procuracaoModal: document.getElementById("procuracaoModal"),
  btnCloseProcModal: document.getElementById("btnCloseProcModal"),
  btnCloseProcBtn: document.getElementById("btnCloseProcBtn"),
  procModalTitle: document.getElementById("procModalTitle"),
  procModalBody: document.getElementById("procModalBody"),

  // MEI Expresso
  meiCnpjInput: document.getElementById("meiCnpjInput"),
  meiPeriodoInput: document.getElementById("meiPeriodoInput"),
  btnEmitirCcmei: document.getElementById("btnEmitirCcmei"),
  btnGerarDasMei: document.getElementById("btnGerarDasMei"),
  btnDividaAtivaMei: document.getElementById("btnDividaAtivaMei"),
  meiResultContainer: document.getElementById("meiResultContainer"),
  meiResultTitle: document.getElementById("meiResultTitle"),
  meiResultBody: document.getElementById("meiResultBody"),

  // Calculadora Sicalc
  sicalcCnpj: document.getElementById("sicalcCnpj"),
  sicalcReceita: document.getElementById("sicalcReceita"),
  sicalcPA: document.getElementById("sicalcPA"),
  sicalcValor: document.getElementById("sicalcValor"),
  sicalcVencimento: document.getElementById("sicalcVencimento"),
  sicalcConsolidacao: document.getElementById("sicalcConsolidacao"),
  btnEmitirDarfSicalc: document.getElementById("btnEmitirDarfSicalc"),
  sicalcResultContainer: document.getElementById("sicalcResultContainer"),
  sicalcResultBody: document.getElementById("sicalcResultBody"),

  // Dossiê Obsidian
  obsidianModal: document.getElementById("obsidianModal"),
  btnCloseObsidianModal: document.getElementById("btnCloseObsidianModal"),
  btnCloseObsidianBtn: document.getElementById("btnCloseObsidianBtn"),
  obsidianPreviewPre: document.getElementById("obsidianPreviewPre"),
  btnCopyMarkdown: document.getElementById("btnCopyMarkdown"),
  btnDownloadDossieMd: document.getElementById("btnDownloadDossieMd"),

  // Kit Mensal
  kitMensalModal: document.getElementById("kitMensalModal"),
  btnCloseKitModal: document.getElementById("btnCloseKitModal"),
  btnCloseKitBtn: document.getElementById("btnCloseKitBtn"),
  kitModalBody: document.getElementById("kitModalBody"),
};

// Formatação monetária e de documentos
function formatCurrency(val) {
  const num = Number(val) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function maskCnpj(val) {
  if (!val) return "-";
  const clean = String(val).replace(/\D/g, "");
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }
  if (clean.length !== 14) return val;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

function formatPa(paStr) {
  if (!paStr) return "-";
  const clean = String(paStr).replace(/\D/g, "");
  if (clean.length === 6) {
    return `${clean.slice(4, 6)}/${clean.slice(0, 4)}`;
  }
  return paStr;
}

function downloadBase64Pdf(base64Data, fileName) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Work Hubs Navigation Mapping
const HUB_TABS = {
  apuracoes: ["dctfweb", "simples", "mei"],
  regularidade: ["sitfis", "parcelamentos", "procuracoes"],
  comunicacao: ["caixapostal", "pagamentos", "sicalc"],
};

function selectHub(hubId) {
  state.activeHub = hubId;
  document.querySelectorAll(".hub-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.getAttribute("data-hub") === hubId);
  });

  const allowedTabs = HUB_TABS[hubId] || [];
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    const tabHub = tab.getAttribute("data-hub");
    if (!tabHub || tabHub === hubId) {
      tab.style.display = "inline-flex";
    } else {
      tab.style.display = "none";
    }
  });

  if (!allowedTabs.includes(state.activeTab)) {
    switchTab(allowedTabs[0]);
  }
}
window.selectHub = selectHub;

// Inicialização
window.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  selectHub("apuracoes");
  await loadStatus();
  await loadCompetencias();
  await loadDominioData();
  await loadSitfisData();
  await loadCaixaPostalData();
  await loadPagamentosData();
  await loadSimplesData();
  await loadParcelamentosData();
  await loadParcelamentosPgfn();
  await loadProcuracoesData();
  await checkWorkerStatus();
});

// Configuração de Event Listeners
function setupEventListeners() {
  // Hubs Pill Listeners
  document.querySelectorAll(".hub-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const hub = pill.getAttribute("data-hub");
      if (hub) selectHub(hub);
    });
  });

  // Tabs Navigation
  const tabButtons = [
    { id: "tabBtnDctfweb", tab: "dctfweb" },
    { id: "tabBtnSitfis", tab: "sitfis" },
    { id: "tabBtnCaixapostal", tab: "caixapostal" },
    { id: "tabBtnPagamentos", tab: "pagamentos" },
    { id: "tabBtnSimples", tab: "simples" },
    { id: "tabBtnParcelamentos", tab: "parcelamentos" },
    { id: "tabBtnProcuracoes", tab: "procuracoes" },
    { id: "tabBtnMei", tab: "mei" },
    { id: "tabBtnSicalc", tab: "sicalc" },
  ];

  tabButtons.forEach(({ id, tab }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => switchTab(tab));
    }
  });

  // DCTFWeb listeners
  dom.compSelect.addEventListener("change", async (e) => {
    state.competencia = e.target.value;
    state.reconciledMap.clear();
    dom.btnExportExcel.setAttribute("disabled", "true");
    await loadDominioData();
  });

  dom.btnLoadDominio.addEventListener("click", async () => {
    await loadDominioData();
  });

  dom.btnEstimate.addEventListener("click", () => openEstimateModal());
  dom.btnRunBatch.addEventListener("click", () => openEstimateModal());

  dom.btnCloseModal.addEventListener("click", () => closeEstimateModal());
  dom.btnCancelEstimate.addEventListener("click", () => closeEstimateModal());

  if (dom.scopeMovimento && dom.scopeTodas) {
    dom.scopeMovimento.addEventListener("change", () => updateEstimateCalculation());
    if (dom.scopeFechamento) dom.scopeFechamento.addEventListener("change", () => updateEstimateCalculation());
    dom.scopeTodas.addEventListener("change", () => updateEstimateCalculation());
  }

  if (dom.chkForceRefresh) {
    dom.chkForceRefresh.addEventListener("change", () => updateEstimateCalculation());
  }

  dom.btnConfirmBatch.addEventListener("click", async () => {
    let escopo = "MOVIMENTO";
    if (dom.scopeFechamento && dom.scopeFechamento.checked) escopo = "FECHAMENTO";
    else if (dom.scopeTodas && dom.scopeTodas.checked) escopo = "TODAS";

    const forceRefresh = dom.chkForceRefresh ? dom.chkForceRefresh.checked : false;
    closeEstimateModal();
    await runBatchReconciliation(escopo, forceRefresh);
  });

  dom.btnExportExcel.addEventListener("click", () => {
    if (state.reconciledMap.size === 0) {
      alert("Aviso: Nenhuma conciliação com a DCTFWeb foi processada ainda para a competência " + state.competencia + ".\n\nPara gerar o relatório Excel, clique no botão 'Conciliar com DCTFWeb' e execute a conciliação do lote.");
      return;
    }
    window.location.href = "/api/export/latest";
  });

  // Fechar modais ao clicar fora (no backdrop)
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        overlay.classList.remove("open");
      }
    });
  });

  // Global Search Instantâneo
  const globalSearch = document.getElementById("globalCompanySearch");
  if (globalSearch) {
    globalSearch.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      state.searchQuery = q;
      state.searchSitfisQuery = q;
      state.searchCaixaQuery = q;
      state.searchPagQuery = q;
      state.searchSimplesQuery = q;
      state.searchParcQuery = q;
      state.searchProcQuery = q;

      if (dom.searchInput) dom.searchInput.value = e.target.value;
      if (dom.searchSitfisInput) dom.searchSitfisInput.value = e.target.value;
      if (dom.searchCaixaInput) dom.searchCaixaInput.value = e.target.value;
      if (dom.searchPagInput) dom.searchPagInput.value = e.target.value;
      if (dom.searchSimplesInput) dom.searchSimplesInput.value = e.target.value;
      if (dom.searchParcInput) dom.searchParcInput.value = e.target.value;
      if (dom.searchProcInput) dom.searchProcInput.value = e.target.value;

      if (state.activeTab === "dctfweb") renderTable();
      else if (state.activeTab === "sitfis") renderSitfisTable();
      else if (state.activeTab === "caixapostal") renderCaixaPostalTable();
      else if (state.activeTab === "pagamentos") renderPagamentosTable();
      else if (state.activeTab === "simples") renderSimplesTable();
      else if (state.activeTab === "parcelamentos") renderParcelamentosTable();
      else if (state.activeTab === "procuracoes") renderProcuracoesTable();
    });
  }

  // Atalho global Ctrl + K e fechar drawer com Escape
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (globalSearch) {
        globalSearch.focus();
        globalSearch.select();
      }
    } else if (e.key === "Escape") {
      fecharPerfilEmpresa360();
    }
  });

  // Drawer Lateral 360° Listeners
  const btnCloseDrawer = document.getElementById("btnCloseDrawer");
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener("click", () => fecharPerfilEmpresa360());
  }

  const companyDrawer = document.getElementById("companyDrawer");
  if (companyDrawer) {
    companyDrawer.addEventListener("click", (e) => {
      if (e.target === companyDrawer) {
        fecharPerfilEmpresa360();
      }
    });
  }

  // BUG-05 FIX: dom.searchInput pode ser null (elemento removido do HTML) — usa guard
  if (dom.searchInput) {
    dom.searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      if (globalSearch && globalSearch.value !== e.target.value) {
        globalSearch.value = e.target.value;
      }
      renderTable();
    });
  }

  // BUG-01 FIX: popular dropdown de sugestões na busca global
  const globalSearchResults = document.getElementById("globalSearchResults");
  if (globalSearch && globalSearchResults) {
    function renderGlobalSearchDropdown(q) {
      if (!q || q.length < 2) {
        globalSearchResults.hidden = true;
        globalSearch.setAttribute("aria-expanded", "false");
        return;
      }
      const matches = state.dominioOverview
        .filter((item) => {
          const nome = (item.empresa.razaoSocial || "").toLowerCase();
          const cnpj = (item.empresa.cnpj || "").replace(/\D/g, "");
          const cod = String(item.empresa.codiEmp || "");
          return nome.includes(q) || cnpj.includes(q) || cod.includes(q);
        })
        .slice(0, 8);

      if (matches.length === 0) {
        globalSearchResults.innerHTML = `<div style="padding: 0.75rem 1rem; font-size: 0.82rem; color: #94A3B8;">Nenhuma empresa encontrada para "${q}"</div>`;
      } else {
        globalSearchResults.innerHTML = matches.map((item) => {
          const combined = getCompanyCombinedState(item);
          const statusDot = combined.status === "CONFORME"
            ? `<span style="width:7px;height:7px;border-radius:50%;background:#22C55E;display:inline-block;flex-shrink:0;"></span>`
            : combined.status === "DIVERGENTE"
              ? `<span style="width:7px;height:7px;border-radius:50%;background:#EF4444;display:inline-block;flex-shrink:0;"></span>`
              : combined.status === "PENDENTE"
                ? `<span style="width:7px;height:7px;border-radius:50%;background:#F59E0B;display:inline-block;flex-shrink:0;"></span>`
                : `<span style="width:7px;height:7px;border-radius:50%;background:#64748B;display:inline-block;flex-shrink:0;"></span>`;
          return `<div role="option" tabindex="0" style="display:flex;align-items:center;gap:0.65rem;padding:0.6rem 1rem;cursor:pointer;transition:background 0.1s;" class="global-search-result-item" data-codi="${item.empresa.codiEmp}"
            onmouseover="this.style.background='rgba(99,102,241,0.08)'" onmouseout="this.style.background=''" 
            onclick="globalSearch.value='';globalSearchResults.hidden=true;switchTab('dctfweb');setTimeout(()=>{ const el=document.getElementById('row-${item.empresa.codiEmp}'); if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('row-highlight');setTimeout(()=>el.classList.remove('row-highlight'),1500);} },200)">
            ${statusDot}
            <div style="min-width:0">
              <div style="font-size:0.82rem;font-weight:600;color:#F1F5F9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.empresa.razaoSocial}</div>
              <div style="font-size:0.73rem;color:#64748B;font-family:monospace">${item.empresa.cnpj}</div>
            </div>
          </div>`;
        }).join("");
      }
      globalSearchResults.hidden = false;
      globalSearch.setAttribute("aria-expanded", "true");
    }

    // Augmentar o handler de input existente com o dropdown
    globalSearch.addEventListener("input", (e) => {
      renderGlobalSearchDropdown(e.target.value.toLowerCase().trim());
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener("click", (e) => {
      if (!globalSearch.contains(e.target) && !globalSearchResults.contains(e.target)) {
        globalSearchResults.hidden = true;
        globalSearch.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (dom.chkShowInactive) {
    dom.chkShowInactive.addEventListener("change", () => {
      updateKpis();
      renderTable();
      updateSitfisKpis();
      renderSitfisTable();
      updateCaixaKpis();
      renderCaixaPostalTable();
      updatePagKpis();
      renderPagamentosTable();
      updateSimplesKpis();
      renderSimplesTable();
      updateParcKpis();
      renderParcelamentosTable();
    });
  }

  document.querySelectorAll(".filter-pill[data-status]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill[data-status]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.currentStatusFilter = pill.getAttribute("data-status");
      renderTable();
    });
  });

  // Situação Fiscal Filters & Search
  if (dom.searchSitfisInput) {
    dom.searchSitfisInput.addEventListener("input", (e) => {
      state.searchSitfisQuery = e.target.value.toLowerCase().trim();
      renderSitfisTable();
    });
  }

  document.querySelectorAll(".filter-pill[data-sitfis-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill[data-sitfis-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.currentSitfisFilter = pill.getAttribute("data-sitfis-filter");
      renderSitfisTable();
    });
  });

  // Caixa Postal Filters, Search & Modal
  if (dom.searchCaixaInput) {
    dom.searchCaixaInput.addEventListener("input", (e) => {
      state.searchCaixaQuery = e.target.value.toLowerCase().trim();
      renderCaixaPostalTable();
    });
  }

  document.querySelectorAll(".filter-pill[data-caixa-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill[data-caixa-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.currentCaixaFilter = pill.getAttribute("data-caixa-filter");
      renderCaixaPostalTable();
    });
  });

  if (dom.btnCloseCaixaModal) dom.btnCloseCaixaModal.addEventListener("click", () => closeCaixaModal());
  if (dom.btnCloseCaixaBtn) dom.btnCloseCaixaBtn.addEventListener("click", () => closeCaixaModal());

  // Pagamentos Filters, Search & Modal
  if (dom.searchPagInput) {
    dom.searchPagInput.addEventListener("input", (e) => {
      state.searchPagQuery = e.target.value.toLowerCase().trim();
      renderPagamentosTable();
    });
  }

  document.querySelectorAll(".filter-pill[data-pag-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill[data-pag-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.currentPagFilter = pill.getAttribute("data-pag-filter");
      renderPagamentosTable();
    });
  });

  if (dom.btnClosePagamentosModal) dom.btnClosePagamentosModal.addEventListener("click", () => closePagamentosModal());
  if (dom.btnClosePagamentosBtn) dom.btnClosePagamentosBtn.addEventListener("click", () => closePagamentosModal());

  // Simples Nacional Filters, Search & Modal
  if (dom.searchSimplesInput) {
    dom.searchSimplesInput.addEventListener("input", (e) => {
      state.searchSimplesQuery = e.target.value.toLowerCase().trim();
      renderSimplesTable();
    });
  }

  document.querySelectorAll(".filter-pill[data-simples-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill[data-simples-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.currentSimplesFilter = pill.getAttribute("data-simples-filter");
      renderSimplesTable();
    });
  });

  if (dom.btnCloseSimplesModal) dom.btnCloseSimplesModal.addEventListener("click", () => closeSimplesModal());
  if (dom.btnCloseSimplesBtn) dom.btnCloseSimplesBtn.addEventListener("click", () => closeSimplesModal());

  // Parcelamentos Filters, Search & Modal
  if (dom.searchParcInput) {
    dom.searchParcInput.addEventListener("input", (e) => {
      state.searchParcQuery = e.target.value.toLowerCase().trim();
      renderParcelamentosTable();
    });
  }

  document.querySelectorAll(".filter-pill[data-parc-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill[data-parc-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.currentParcFilter = pill.getAttribute("data-parc-filter");
      renderParcelamentosTable();
    });
  });

  if (dom.btnCloseParcModal) dom.btnCloseParcModal.addEventListener("click", () => closeParcModal());
  if (dom.btnCloseParcBtn) dom.btnCloseParcBtn.addEventListener("click", () => closeParcModal());

  // Procurações Filters & Search
  if (dom.searchProcInput) {
    dom.searchProcInput.addEventListener("input", (e) => {
      state.searchProcQuery = e.target.value.toLowerCase().trim();
      renderProcuracoesTable();
    });
  }

  document.querySelectorAll(".filter-pill[data-proc-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".filter-pill[data-proc-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.currentProcFilter = pill.getAttribute("data-proc-filter");
      renderProcuracoesTable();
    });
  });

  if (dom.btnCloseProcModal) dom.btnCloseProcModal.addEventListener("click", () => closeProcModal());
  if (dom.btnCloseProcBtn) dom.btnCloseProcBtn.addEventListener("click", () => closeProcModal());

  // Worker Noturno
  if (dom.btnRunWorker) dom.btnRunWorker.addEventListener("click", () => abrirModalWorker());
  if (dom.btnCloseWorkerModal) dom.btnCloseWorkerModal.addEventListener("click", () => closeWorkerModal());
  if (dom.btnCloseWorkerBtn) dom.btnCloseWorkerBtn.addEventListener("click", () => closeWorkerModal());
  if (dom.btnTriggerWorkerNow) dom.btnTriggerWorkerNow.addEventListener("click", () => triggerWorker(5));
  if (dom.btnTriggerWorkerAll) dom.btnTriggerWorkerAll.addEventListener("click", () => triggerWorker());

  // MEI Expresso
  if (dom.btnEmitirCcmei) dom.btnEmitirCcmei.addEventListener("click", () => emitirCcmei());
  if (dom.btnGerarDasMei) dom.btnGerarDasMei.addEventListener("click", () => gerarDasMei());
  if (dom.btnDividaAtivaMei) dom.btnDividaAtivaMei.addEventListener("click", () => consultarDividaAtivaMei());

  // Calculadora Sicalc
  if (dom.btnEmitirDarfSicalc) dom.btnEmitirDarfSicalc.addEventListener("click", () => emitirDarfSicalc());

  // Dossiê Obsidian
  if (dom.btnCloseObsidianModal) dom.btnCloseObsidianModal.addEventListener("click", () => closeObsidianModal());
  if (dom.btnCloseObsidianBtn) dom.btnCloseObsidianBtn.addEventListener("click", () => closeObsidianModal());
  if (dom.btnCopyMarkdown) dom.btnCopyMarkdown.addEventListener("click", () => copiarMarkdownObsidian());
  if (dom.btnDownloadDossieMd) dom.btnDownloadDossieMd.addEventListener("click", () => baixarDossieMarkdown());

  // Kit Mensal
  if (dom.btnCloseKitModal) dom.btnCloseKitModal.addEventListener("click", () => closeKitModal());
  if (dom.btnCloseKitBtn) dom.btnCloseKitBtn.addEventListener("click", () => closeKitModal());
}

function switchTab(tabId) {
  state.activeTab = tabId;

  // Sincroniza o Work Hub ativo caso a aba selecionada pertença a outro hub
  const activeTabBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (activeTabBtn) {
    const hubId = activeTabBtn.getAttribute("data-hub");
    if (hubId && hubId !== state.activeHub) {
      state.activeHub = hubId;
      document.querySelectorAll(".hub-pill").forEach((pill) => {
        pill.classList.toggle("active", pill.getAttribute("data-hub") === hubId);
      });
      document.querySelectorAll(".nav-tab").forEach((tab) => {
        const tabHub = tab.getAttribute("data-hub");
        if (!tabHub || tabHub === hubId) {
          tab.style.display = "inline-flex";
        } else {
          tab.style.display = "none";
        }
      });
    }
  }

  const tabs = [
    "dctfweb",
    "sitfis",
    "caixapostal",
    "pagamentos",
    "simples",
    "parcelamentos",
    "procuracoes",
    "mei",
    "sicalc",
  ];
  tabs.forEach((t) => {
    const btnId = "tabBtn" + t.charAt(0).toUpperCase() + t.slice(1);
    const viewId = "view" + t.charAt(0).toUpperCase() + t.slice(1);
    const btn = document.getElementById(btnId);
    const view = document.getElementById(viewId);
    if (btn) btn.classList.toggle("active", t === tabId);
    if (view) view.style.display = t === tabId ? "block" : "none";
  });

  const headerActions = document.getElementById("headerActionsDctfweb");
  if (headerActions) {
    headerActions.style.display = tabId === "dctfweb" ? "flex" : "none";
  }

  if (tabId === "sitfis") renderSitfisTable();
  if (tabId === "caixapostal") renderCaixaPostalTable();
  if (tabId === "pagamentos") renderPagamentosTable();
  if (tabId === "simples") renderSimplesTable();
  if (tabId === "parcelamentos") {
    renderParcelamentosTable();
    renderTablePgfn();
  }
  if (tabId === "procuracoes") renderProcuracoesTable();
}

async function loadStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    if (data.dominio?.dsn) {
      dom.dbStatusText.textContent = `Domínio: ${data.dominio.dsn} (Conectado)`;
    }
    const lanBadge = document.getElementById("lanBadge");
    const lanStatusText = document.getElementById("lanStatusText");
    if (data.network?.lanUrl) {
      if (lanStatusText) {
        lanStatusText.textContent = `Rede: ${data.network.lanUrl}`;
      }
      if (lanBadge) {
        lanBadge.onclick = () => {
          navigator.clipboard
            .writeText(data.network.lanUrl)
            .then(() => {
              const originalText = lanStatusText.textContent;
              lanStatusText.textContent = "Link copiado!";
              setTimeout(() => {
                lanStatusText.textContent = originalText;
              }, 2500);
            })
            .catch(() => {
              alert(`Link da rede interna:\n${data.network.lanUrl}`);
            });
        };
      }
    } else if (lanBadge) {
      lanBadge.style.display = "none";
    }
  } catch {
    dom.dbStatusText.textContent = "Domínio: Conexão Local Ativa";
  }
}

async function loadCompetencias() {
  try {
    const res = await fetch("/api/dominio/competencias");
    const list = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      let optionsHtml = "";
      for (const item of list) {
        const selected = item.competencia === state.competencia ? "selected" : "";
        optionsHtml += `<option value="${item.competencia}" ${selected}>${item.competencia} (${item.totalEmpresas} empresas com Reinf)</option>`;
      }
      dom.compSelect.innerHTML = optionsHtml;
      state.competencia = dom.compSelect.value;
    }
  } catch (err) {
    console.warn("Falha ao carregar lista de competências:", err);
  }
}

function renderSkeletonTable() {
  if (!dom.tableBody) return;
  let rows = "";
  for (let i = 0; i < 8; i++) {
    rows += `
      <tr class="skeleton-row">
        <td style="text-align: center;"><div class="skeleton" style="height: 14px; width: 14px; margin: auto;"></div></td>
        <td><div class="skeleton" style="height: 14px; width: 36px;"></div></td>
        <td><div class="skeleton" style="height: 14px; width: 130px;"></div></td>
        <td><div class="skeleton" style="height: 14px; width: 220px;"></div></td>
        <td><div class="skeleton" style="height: 18px; width: 95px; border-radius: 9999px;"></div></td>
        <td style="text-align: right;"><div class="skeleton" style="height: 14px; width: 75px; margin-left: auto;"></div></td>
        <td style="text-align: right;"><div class="skeleton" style="height: 14px; width: 75px; margin-left: auto;"></div></td>
        <td style="text-align: right;"><div class="skeleton" style="height: 14px; width: 70px; margin-left: auto;"></div></td>
        <td><div class="skeleton" style="height: 20px; width: 85px; border-radius: 9999px;"></div></td>
        <td><div class="skeleton" style="height: 26px; width: 110px; border-radius: 6px;"></div></td>
      </tr>
    `;
  }
  dom.tableBody.innerHTML = rows;
}

// Drawer Perfil Fiscal 360° da Empresa
function fecharPerfilEmpresa360() {
  const drawer = document.getElementById("companyDrawer");
  if (drawer) {
    drawer.classList.remove("active");
    drawer.classList.remove("open");
  }
}
window.fecharPerfilEmpresa360 = fecharPerfilEmpresa360;

window.abrirPerfilEmpresa360 = function (codiEmpOrCnpj) {
  const drawer = document.getElementById("companyDrawer");
  if (!drawer) return;

  const targetClean = String(codiEmpOrCnpj || "").trim();
  const targetDigits = targetClean.replace(/\D/g, "");

  // Localiza a empresa pelo código Domínio ou CNPJ
  const item = state.dominioOverview.find((d) => {
    return (
      String(d.empresa.codiEmp) === targetClean ||
      d.empresa.cnpj.replace(/\D/g, "") === targetDigits
    );
  });

  if (!item) {
    console.warn("Empresa não localizada para abertura do Perfil 360°:", codiEmpOrCnpj);
    return;
  }

  const emp = item.empresa;
  const cleanCnpj = emp.cnpj.replace(/\D/g, "");
  const combined = getCompanyCombinedState(item);

  // Cabeçalho do Drawer
  const nameEl = document.getElementById("drawerCompanyName");
  const cnpjEl = document.getElementById("drawerCompanyCnpj");
  const badgeEl = document.getElementById("drawerRegimeBadge");

  if (nameEl) nameEl.textContent = emp.razaoSocial || `Empresa ${emp.codiEmp}`;
  if (cnpjEl) cnpjEl.textContent = maskCnpj(emp.cnpj);

  if (badgeEl) {
    if (emp.ativo === false) {
      badgeEl.textContent = "INATIVA";
      badgeEl.className = "drawer-badge badge-inativa";
    } else {
      const simples = state.simplesMap.get(cleanCnpj);
      if (simples?.optante) {
        badgeEl.textContent = "SIMPLES NACIONAL";
        badgeEl.className = "drawer-badge badge-simples";
      } else {
        badgeEl.textContent = "EMPRESA ATIVA";
        badgeEl.className = "drawer-badge";
      }
    }
  }

  // Diagnóstico Fiscal 360°
  const stDctf = document.getElementById("drawerStatusDctfweb");
  if (stDctf) {
    stDctf.textContent = combined.statusLabel || "Pendente";
    stDctf.className = `font-mono status-badge ${combined.statusClass}`;
  }

  const stSit = document.getElementById("drawerStatusSitfis");
  if (stSit) {
    const sitfis = state.sitfisMap.get(cleanCnpj);
    if (!sitfis) {
      stSit.textContent = "Não consultado";
      stSit.className = "font-mono";
    } else if (sitfis.situacao === "REGULAR" || sitfis.cndEmitida) {
      stSit.textContent = "CND Negativa (Regular)";
      stSit.className = "font-mono text-success";
    } else {
      stSit.textContent = sitfis.statusLabel || "Com Pendências";
      stSit.className = "font-mono text-warning";
    }
  }

  const stCaixa = document.getElementById("drawerStatusCaixa");
  if (stCaixa) {
    const cx = state.caixaMap.get(cleanCnpj);
    if (!cx) {
      stCaixa.textContent = "Não consultado";
      stCaixa.className = "font-mono";
    } else if (cx.mensagensNaoLidas > 0) {
      stCaixa.textContent = `${cx.mensagensNaoLidas} novas mensagens`;
      stCaixa.className = "font-mono text-warning";
    } else {
      stCaixa.textContent = "Sem pendências DTE";
      stCaixa.className = "font-mono text-success";
    }
  }

  const stProc = document.getElementById("drawerStatusProc");
  if (stProc) {
    const pr = state.procuracoesMap.get(cleanCnpj);
    if (!pr) {
      stProc.textContent = "Não verificado";
      stProc.className = "font-mono";
    } else if (pr.alertaVencimento) {
      stProc.textContent = "Vence em breve";
      stProc.className = "font-mono text-warning";
    } else {
      stProc.textContent = pr.status || "Vigente";
      stProc.className = "font-mono text-success";
    }
  }

  // Totais da Competência
  const compLabel = document.getElementById("drawerCompLabel");
  if (compLabel) compLabel.textContent = state.competencia;

  const valDom = document.getElementById("drawerValDominio");
  if (valDom) valDom.textContent = formatCurrency(item.totalGeralDominio);

  const valDctf = document.getElementById("drawerValDctfweb");
  if (valDctf) valDctf.textContent = combined.isConsulted ? formatCurrency(combined.totalDctfweb) : "Pendente";

  const valDiff = document.getElementById("drawerValDiferenca");
  if (valDiff) {
    if (combined.isConsulted) {
      const isDiff = Math.abs(combined.diferenca) >= 0.01;
      valDiff.textContent = formatCurrency(combined.diferenca);
      valDiff.className = `font-mono ${isDiff ? "diff-positive" : "diff-zero"}`;
    } else {
      valDiff.textContent = "-";
      valDiff.className = "font-mono";
    }
  }

  // Ações Operacionais Diretas
  const btnRec = document.getElementById("drawerBtnReconciliar");
  if (btnRec) {
    btnRec.onclick = () => {
      fecharPerfilEmpresa360();
      reprocessSingle(emp.codiEmp, combined.isConsulted);
    };
  }

  const btnDarf = document.getElementById("drawerBtnEmitirDarf");
  if (btnDarf) {
    btnDarf.onclick = () => {
      emitirDarfDctfweb(emp.cnpj, state.competencia);
    };
  }

  const btnKit = document.getElementById("drawerBtnKitMensal");
  if (btnKit) {
    btnKit.onclick = () => {
      abrirModalKitMensal(emp.cnpj);
    };
  }

  const btnObs = document.getElementById("drawerBtnObsidian");
  if (btnObs) {
    btnObs.onclick = () => {
      abrirModalObsidian(emp.cnpj);
    };
  }

  // Abre a gaveta lateral
  drawer.classList.add("active", "open");
};

async function loadDominioData() {
  renderSkeletonTable();
  showLoading(`Capturando dados do Domínio para ${state.competencia}...`);
  try {
    const res = await fetch(`/api/dominio/overview?competencia=${encodeURIComponent(state.competencia)}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error(data.error || "Formato de resposta inválido.");
    }

    state.dominioOverview = data;

    // Recuperar conciliações persistidas do banco SQLite
    try {
      const persRes = await fetch(`/api/persisted?competencia=${encodeURIComponent(state.competencia)}`);
      const persList = await persRes.json();
      if (Array.isArray(persList)) {
        for (const r of persList) {
          state.reconciledMap.set(r.empresa.codiEmp, r);
        }
        if (persList.length > 0) {
          dom.btnExportExcel.removeAttribute("disabled");
        }
      }
    } catch {
      // Ignora falha de cache
    }

    updateKpis();
    renderTable();
    updateSitfisKpis();
    renderSitfisTable();
    updateCaixaKpis();
    renderCaixaPostalTable();
    updatePagKpis();
    renderPagamentosTable();
    updateSimplesKpis();
    renderSimplesTable();
    updateParcKpis();
    renderParcelamentosTable();
  } catch (err) {
    alert("Erro ao conectar no banco Domínio: " + err.message);
  } finally {
    hideLoading();
  }
}

/* ========================================================================= */
/* MÓDULO 1: CONFERÊNCIA DCTFWEB                                            */
/* ========================================================================= */

function getCompanyCombinedState(item) {
  const rec = state.reconciledMap.get(item.empresa.codiEmp);
  if (rec) {
    let statusClass = "badge-neutral";
    let statusLabel = rec.status;

    if (rec.status === "CONFORME") {
      statusClass = "badge-success";
      statusLabel = "CONFORME";
    } else if (rec.status === "DIVERGENTE") {
      statusClass = "badge-danger";
      statusLabel = "DIVERGENTE";
    } else if (rec.status === "PENDENTE") {
      statusClass = "badge-warning";
      statusLabel = "PENDENTE";
    } else if (rec.status === "SEM_DCTFWEB") {
      statusClass = "badge-purple";
      statusLabel = "SEM DCTFWEB";
    } else if (rec.status === "ERRO") {
      statusClass = "badge-danger";
      statusLabel = "ERRO SERPRO";
    }

    return {
      status: rec.status,
      statusClass,
      statusLabel,
      totalDctfweb: rec.totalDctfweb,
      diferenca: rec.diferenca,
      detalhes: rec.detalhes,
      pendencias: rec.pendencias,
      reciboDctfweb: rec.reciboDctfweb,
      dataUltimaConsulta: rec.dataUltimaConsulta,
      origemConsulta: rec.origemConsulta,
      isConsulted: true,
    };
  }

  return {
    status: item.situacaoGeral,
    statusClass: item.temMovimento ? "badge-blue" : "badge-neutral",
    statusLabel: item.temMovimento ? "Com Movimento" : "Sem Movimento",
    totalDctfweb: 0,
    diferenca: 0,
    detalhes: [],
    pendencias: item.pendencias || [],
    reciboDctfweb: null,
    dataUltimaConsulta: null,
    origemConsulta: null,
    isConsulted: false,
  };
}

function updateKpis() {
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);
  const totalInativas = state.dominioOverview.filter((item) => item.empresa.ativo === false).length;

  let totalDominio = 0;
  let totalDctfweb = 0;
  let comMov = 0;
  let semMov = 0;
  let conformes = 0;
  let divergentes = 0;
  let pendentes = 0;
  let semDctf = 0;

  for (const item of list) {
    const combined = getCompanyCombinedState(item);

    if (item.temMovimento) comMov++;
    else semMov++;

    if (combined.isConsulted) {
      if (combined.status === "CONFORME") conformes++;
      else if (combined.status === "DIVERGENTE") divergentes++;
      else if (combined.status === "PENDENTE") pendentes++;
      else if (combined.status === "SEM_DCTFWEB") semDctf++;

      totalDominio += item.totalGeralDominio || 0;
      totalDctfweb += combined.totalDctfweb || 0;
    }
  }

  const diferenca = totalDctfweb - totalDominio;

  dom.valTotalEmpresas.textContent = list.length;
  if (dom.subTotalEmpresas) {
    dom.subTotalEmpresas.textContent = `${state.dominioOverview.length} cadastradas na base`;
  }
  dom.valComMovimento.textContent = comMov;
  dom.valConformes.textContent = conformes;
  dom.valDivergentes.textContent = divergentes;
  dom.valPendentes.textContent = pendentes;
  dom.valSemDctf.textContent = semDctf;

  dom.finTotalDominio.textContent = formatCurrency(totalDominio);
  dom.finTotalDctfweb.textContent = formatCurrency(totalDctfweb);
  dom.finTotalDiferenca.textContent = formatCurrency(diferenca);

  if (Math.abs(diferenca) < 0.01) {
    dom.finTotalDiferenca.className = "fin-value fin-diff";
  } else {
    dom.finTotalDiferenca.className = "fin-value fin-diff diff-has-val";
  }

  dom.countComMov.textContent = comMov;
  dom.countSemMov.textContent = semMov;
  dom.countAll.textContent = list.length;
  dom.countConf.textContent = conformes;
  dom.countDiv.textContent = divergentes;
  dom.countPend.textContent = pendentes;
  dom.countSemDctf.textContent = semDctf;
  if (dom.countInativas) {
    dom.countInativas.textContent = totalInativas;
  }

  // BUG-02 FIX: atualiza o contador de cobertura da conciliação
  const finCoverageEl = document.getElementById("finCoverage");
  if (finCoverageEl) {
    const conciliadas = conformes + divergentes + pendentes + semDctf;
    finCoverageEl.textContent = comMov > 0
      ? `${conciliadas} de ${comMov} empresas conciliadas`
      : `0 empresas com recibo Reinf`;
  }
}

function getFilteredList() {
  const q = state.searchQuery;
  const statusFilter = state.currentStatusFilter;
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;

  return state.dominioOverview.filter((item) => {
    if (!showInactive && item.empresa.ativo === false) {
      return false;
    }

    const combined = getCompanyCombinedState(item);

    if (statusFilter === "COM_MOVIMENTO") {
      if (!item.temMovimento) return false;
    } else if (statusFilter === "SEM_MOVIMENTO") {
      if (item.temMovimento) return false;
    } else if (statusFilter !== "ALL") {
      if (combined.status !== statusFilter) {
        return false;
      }
    }

    if (q) {
      const matchCod = item.empresa.codiEmp.toLowerCase().includes(q);
      const matchRazao = item.empresa.razaoSocial.toLowerCase().includes(q);
      const matchCnpj = item.empresa.cnpj.toLowerCase().includes(q);
      if (!matchCod && !matchRazao && !matchCnpj) {
        return false;
      }
    }

    return true;
  });
}

function renderTable() {
  const filtered = getFilteredList();

  if (filtered.length === 0) {
    dom.tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          Nenhuma empresa encontrada para os filtros selecionados (${state.currentStatusFilter}).
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (const item of filtered) {
    const combined = getCompanyCombinedState(item);
    const isExpanded = state.expandedRows.has(item.empresa.codiEmp);
    const isAtiva = item.empresa.ativo !== false;

    let fechamentoBadges = "";
    if (item.reabertoR2000 || item.reabertoR4000) {
      fechamentoBadges += `<span class="badge-reinf-recibo badge-reaberto" title="Período foi reaberto">Reaberto</span>`;
    }
    if (item.reciboR2000) {
      fechamentoBadges += `<span class="badge-reinf-recibo badge-r2000" title="Recibo R-2000: ${item.reciboR2000}">R-2000: ${item.reciboR2000.slice(0, 10)}...</span>`;
    }
    if (item.reciboR4000) {
      fechamentoBadges += `<span class="badge-reinf-recibo badge-r4000" title="Recibo R-4000: ${item.reciboR4000}">R-4000: ${item.reciboR4000.slice(0, 10)}...</span>`;
    }
    if (!fechamentoBadges) {
      fechamentoBadges = `<span class="badge-reinf-recibo badge-empty">Sem fechamento</span>`;
    }

    const dctfText = combined.isConsulted
      ? formatCurrency(combined.totalDctfweb)
      : `<span style="color: var(--text-muted); font-size: 0.8rem;">Pendente</span>`;

    let diffText = `<span style="color: var(--text-muted);">-</span>`;
    if (combined.isConsulted) {
      const isDiff = Math.abs(combined.diferenca) >= 0.01;
      diffText = `<span class="${isDiff ? "diff-positive" : "diff-zero"}">${formatCurrency(combined.diferenca)}</span>`;
    }

    const rowClasses = `company-row ${isExpanded ? "expanded" : ""} ${!isAtiva ? "row-inactive" : ""}`.trim();
    const inactiveBadgeHtml = !isAtiva
      ? `<span class="badge-inativa" title="Empresa cadastrada como inativa no Domínio">INATIVA</span>`
      : "";
    const btnActionClass = !isAtiva ? "btn btn-secondary btn-inactive-action" : "btn btn-secondary";
    const btnActionTitle = !isAtiva ? ' title="Empresa com situação Inativa no Domínio"' : "";

    html += `
      <tr id="row-${item.empresa.codiEmp}" class="${rowClasses}" onclick="toggleRow('${item.empresa.codiEmp}')">
        <td style="text-align: center;">
          <span style="font-size: 0.8rem; opacity: 0.7;">${isExpanded ? "▼" : "▶"}</span>
        </td>
        <td class="mono"><strong>${item.empresa.codiEmp}</strong></td>
        <td class="mono">${maskCnpj(item.empresa.cnpj)}</td>
        <td>
          <strong>${item.empresa.razaoSocial}</strong>${inactiveBadgeHtml}
        </td>
        <td>${fechamentoBadges}</td>
        <td class="mono">${formatCurrency(item.totalGeralDominio)}</td>
        <td class="mono">${dctfText}</td>
        <td class="mono">${diffText}</td>
        <td>
          <span class="status-badge ${combined.statusClass}">
            ${combined.statusLabel}
          </span>
          ${
            combined.isConsulted && combined.dataUltimaConsulta
              ? `
            <div class="consultation-meta">
              <span title="Data e hora da consulta à API SERPRO">${formatDateTime(combined.dataUltimaConsulta)}</span>
              ${
                combined.origemConsulta === "CACHE_PERSISTIDO"
                  ? '<span class="badge-cache" title="Economia garantida: recuperado do banco local sem cobrança SERPRO">Cache</span>'
                  : '<span class="badge-live" title="Consulta realizada ao vivo no SERPRO">Ao vivo</span>'
              }
            </div>
            `
              : ""
          }
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <button class="${btnActionClass}" style="padding: 0.35rem 0.7rem; font-size: 0.75rem;"${btnActionTitle} onclick="event.stopPropagation(); reprocessSingle('${item.empresa.codiEmp}', ${combined.isConsulted})">
              ${combined.isConsulted ? "Reconsultar" : "Consultar"}
            </button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;" title="Perfil Fiscal 360° da Empresa" onclick="event.stopPropagation(); abrirPerfilEmpresa360('${item.empresa.codiEmp}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;

    if (isExpanded) {
      html += renderDetailSubTable(item, combined);
    }
  }

  dom.tableBody.innerHTML = html;
}

function renderDetailSubTable(item, combined) {
  if (!combined.isConsulted) {
    return `
      <tr class="sub-table-row">
        <td colspan="10">
          <div class="sub-table-container">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <h4 style="color: #38BDF8; font-size: 0.85rem; text-transform: uppercase;">Dados Extraídos do Domínio (${state.competencia})</h4>
                <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.3rem;">
                  Total R-2000 (CP): <strong>${formatCurrency(item.totalR2000)}</strong> | 
                  Total R-4000 (RET): <strong>${formatCurrency(item.totalR4000)}</strong> | 
                  Recibos: <strong>${item.reciboR2000 || "Nenhum"}</strong> / <strong>${item.reciboR4000 || "Nenhum"}</strong>
                </p>
              </div>
              <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="event.stopPropagation(); reprocessSingle('${item.empresa.codiEmp}', false)">
                Consultar DCTFWeb no SERPRO
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  const darfButtonHtml =
    combined.isConsulted && combined.status !== "SEM_DCTFWEB"
      ? `
      <button class="btn btn-success" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem;" onclick="event.stopPropagation(); emitirDarfDctfweb('${item.empresa.cnpj}', '${state.competencia}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Emitir DARF Oficial (PDF)
      </button>
      `
      : "";

  const metaBannerHtml = `
    <div class="sub-header-banner">
      <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; font-size: 0.8rem;">
        <div>
          <span style="color: #94A3B8;">Última Consulta SERPRO:</span>
          <strong style="color: #F8FAFC; margin-left: 0.35rem;">${formatDateTime(combined.dataUltimaConsulta)}</strong>
        </div>
        <div>
          <span style="color: #94A3B8;">Origem do Dado:</span>
          ${
            combined.origemConsulta === "CACHE_PERSISTIDO"
              ? '<span class="badge-cache" style="margin-left: 0.25rem;">Cache Persistido (Economia de Tarifa)</span>'
              : '<span class="badge-live" style="margin-left: 0.25rem;">API SERPRO Ao Vivo</span>'
          }
        </div>
        <div>
          <span style="color: #94A3B8;">Recibo DCTFWeb:</span>
          ${
            combined.reciboDctfweb
              ? `<strong style="color: #60A5FA; margin-left: 0.35rem; font-family: monospace; font-size: 0.8rem;">${combined.reciboDctfweb}</strong>`
              : combined.status === "PENDENTE"
                ? `<span style="color: #F59E0B; margin-left: 0.35rem; font-size: 0.78rem;">Consulta bloqueada (pendência no Domínio)</span>`
                : combined.status === "SEM_DCTFWEB"
                  ? `<span style="color: #94A3B8; margin-left: 0.35rem; font-size: 0.78rem;">Não encontrado no SERPRO</span>`
                  : `<span style="color: #94A3B8; margin-left: 0.35rem; font-size: 0.78rem;">Não consultado</span>`
          }
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        ${darfButtonHtml}
        <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;" onclick="event.stopPropagation(); reprocessSingle('${item.empresa.codiEmp}', true)">
          ↻ Forçar Reconsulta SERPRO
        </button>
      </div>
    </div>
  `;

  if (!combined.detalhes || combined.detalhes.length === 0) {
    let msg = "Nenhum totalizador com valor apurado para comparação.";
    if (combined.pendencias?.length > 0) {
      const pendItems = combined.pendencias
        .map((p) => {
          const isRejeicao = p.toLowerCase().includes("não foi aceito") || p.toLowerCase().includes("rejeitado");
          const isReaberto = p.toLowerCase().includes("reaberto");
          const isExcluido = p.toLowerCase().includes("excluído");
          const badgeClass = isRejeicao ? "badge-danger" : isReaberto ? "badge-warning" : isExcluido ? "badge-warning" : "badge-warning";
          const icon = isRejeicao
            ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
            : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
          return `<div style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.45rem 0.6rem; background: rgba(239,68,68,0.08); border-left: 3px solid var(--danger); border-radius: 4px; margin-bottom: 0.35rem;">
            <span style="color: var(--danger); flex-shrink: 0; margin-top: 1px;">${icon}</span>
            <span style="font-size: 0.8rem; color: #E2E8F0; line-height: 1.4;">${p}</span>
          </div>`;
        })
        .join("");
      msg = `<div style="margin-bottom: 0.3rem;"><strong style="font-size: 0.8rem; color: #F87171;">Pendências no Domínio — Conformidade Bloqueada:</strong></div>${pendItems}`;
    } else if (combined.status === "SEM_DCTFWEB") {
      msg = "Declaração DCTFWeb não transmitida ou ausente no SERPRO.";
    }

    return `
      <tr class="sub-table-row">
        <td colspan="10">
          <div class="sub-table-container">
            ${metaBannerHtml}
            <div style="color: #FBBF24; padding: 0.5rem 0;">
              ${msg}
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  let rowsHtml = "";
  for (const d of combined.detalhes) {
    const isDiff = Math.abs(d.diferenca) >= 0.01;
    rowsHtml += `
      <tr>
        <td><strong>${d.serie}</strong></td>
        <td>${d.origem === 6 ? "Reinf CP (6)" : "Reinf RET (7)"}</td>
        <td class="mono"><strong>${d.codigoReceita}</strong></td>
        <td>${d.tipoValor}</td>
        <td class="mono">${formatCurrency(d.valorDominio)}</td>
        <td class="mono">${formatCurrency(d.valorDctfweb)}</td>
        <td class="mono ${isDiff ? "diff-positive" : "diff-zero"}">
          ${formatCurrency(d.diferenca)}
        </td>
        <td>
          <span style="font-weight: 500; color: ${isDiff ? "#F87171" : "#34D399"};">
            ${d.situacao}
          </span>
        </td>
        <td style="font-size: 0.75rem; color: #9CA3AF;">${d.observacao || ""}</td>
      </tr>
    `;
  }

  return `
    <tr class="sub-table-row">
      <td colspan="10">
        <div class="sub-table-container">
          ${metaBannerHtml}
          <h4 style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #60A5FA; margin-bottom: 0.5rem;">
            Detalhamento Tributário (Domínio × DCTFWeb SERPRO)
          </h4>
          <table class="sub-table">
            <thead>
              <tr>
                <th>Série</th>
                <th>Origem</th>
                <th>Código Receita</th>
                <th>Tipo Valor</th>
                <th>Valor Domínio</th>
                <th>Valor DCTFWeb</th>
                <th>Diferença</th>
                <th>Situação</th>
                <th>Diagnóstico</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  `;
}

window.toggleRow = function (codiEmp) {
  if (state.expandedRows.has(codiEmp)) {
    state.expandedRows.delete(codiEmp);
  } else {
    state.expandedRows.add(codiEmp);
  }
  renderTable();
};

window.reprocessSingle = async function (codiEmp, forceRefresh = false) {
  const actionText = forceRefresh ? "Reconsultando (ao vivo)" : "Consultando";
  showLoading(`${actionText} DCTFWeb no SERPRO para a empresa ${codiEmp}...`);
  try {
    const res = await fetch("/api/reconcile/single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        competencia: state.competencia,
        codiEmp,
        forceRefresh: Boolean(forceRefresh),
      }),
    });

    const singleResult = await res.json();
    if (singleResult.error) {
      throw new Error(singleResult.error);
    }

    state.reconciledMap.set(codiEmp, singleResult);
    state.expandedRows.add(codiEmp);
    dom.btnExportExcel.removeAttribute("disabled");

    updateKpis();
    renderTable();
  } catch (err) {
    alert("Erro ao consultar empresa no SERPRO: " + err.message);
  } finally {
    hideLoading();
  }
};

window.emitirDarfDctfweb = async function (cnpj, competencia) {
  showLoading(`Gerando Guia Oficial DARF DCTFWeb para o CNPJ ${maskCnpj(cnpj)}...`);
  try {
    const res = await fetch("/api/guias/darf-dctfweb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, competencia }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.pdfBase64) throw new Error("A API não retornou o arquivo PDF do DARF.");
    downloadBase64Pdf(data.pdfBase64, `darf_dctfweb_${cnpj}_${competencia}.pdf`);
  } catch (err) {
    alert("Erro ao emitir DARF DCTFWeb: " + err.message);
  } finally {
    hideLoading();
  }
};

function openEstimateModal() {
  dom.estCompetencia.textContent = state.competencia;
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);

  const comMovimentoCount = list.filter((item) => item.temMovimento).length;
  const comFechamentoCount = list.filter((item) => item.reciboR2000 || item.reciboR4000).length;

  dom.estMovimentoEmpresas.textContent = `${comMovimentoCount} empresa(s)`;
  if (dom.estFechamentoEmpresas) {
    dom.estFechamentoEmpresas.textContent = `${comFechamentoCount} empresa(s)`;
  }
  dom.estTotalEmpresas.textContent = `${list.length} empresa(s)`;

  updateEstimateCalculation();
  dom.estimateModal.classList.add("active");
}

function updateEstimateCalculation() {
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);

  let escopo = "MOVIMENTO";
  if (dom.scopeFechamento && dom.scopeFechamento.checked) escopo = "FECHAMENTO";
  else if (dom.scopeTodas && dom.scopeTodas.checked) escopo = "TODAS";

  const forceRefresh = dom.chkForceRefresh ? dom.chkForceRefresh.checked : false;

  let count = 0;
  for (const item of list) {
    if (escopo === "MOVIMENTO" && !item.temMovimento) continue;
    if (escopo === "FECHAMENTO" && !item.reciboR2000 && !item.reciboR4000) continue;

    if (!forceRefresh && state.reconciledMap.has(item.empresa.codiEmp)) {
      continue;
    }
    count++;
  }

  dom.estTotalChamadas.textContent = `${count} consulta(s) tarifada(s)`;
}

function closeEstimateModal() {
  dom.estimateModal.classList.remove("active");
}

async function runBatchReconciliation(escopo, forceRefresh) {
  showLoading(`Executando conciliação em lote com DCTFWeb (${escopo})...`);
  try {
    const res = await fetch("/api/reconcile/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        competencia: state.competencia,
        escopo,
        forceRefresh: Boolean(forceRefresh),
      }),
    });

    const summary = await res.json();
    if (summary.error) {
      throw new Error(summary.error);
    }

    state.summary = summary;
    for (const r of summary.resultados) {
      state.reconciledMap.set(r.empresa.codiEmp, r);
    }

    dom.btnExportExcel.removeAttribute("disabled");
    updateKpis();
    renderTable();
  } catch (err) {
    alert("Erro na conciliação em lote: " + err.message);
  } finally {
    hideLoading();
  }
}

/* ========================================================================= */
/* MÓDULO 2: SITUAÇÃO FISCAL & CND (RFB / PGFN)                              */
/* ========================================================================= */

async function loadSitfisData() {
  try {
    const res = await fetch("/api/sitfis/list");
    const list = await res.json();
    if (Array.isArray(list)) {
      for (const item of list) {
        state.sitfisMap.set(item.cnpj, item);
      }
    }
    updateSitfisKpis();
    renderSitfisTable();
  } catch (err) {
    console.warn("Falha ao carregar cache de Situação Fiscal:", err);
  }
}

function updateSitfisKpis() {
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);

  let regular = 0;
  let pendencias = 0;
  let processando = 0;
  let naoConsultadas = 0;

  for (const item of list) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const sit = state.sitfisMap.get(cnpj);
    if (!sit) {
      naoConsultadas++;
    } else if (sit.situacao === "REGULAR") {
      regular++;
    } else if (sit.situacao === "PROCESSANDO") {
      processando++;
    } else {
      pendencias++;
    }
  }

  if (dom.valSitfisTotal) dom.valSitfisTotal.textContent = list.length;
  if (dom.valSitfisRegular) dom.valSitfisRegular.textContent = regular;
  if (dom.valSitfisPendencias) dom.valSitfisPendencias.textContent = pendencias;
  if (dom.valSitfisProcessando) dom.valSitfisProcessando.textContent = processando;
  if (dom.valSitfisNaoConsultadas) dom.valSitfisNaoConsultadas.textContent = naoConsultadas;

  if (dom.countSitfisAll) dom.countSitfisAll.textContent = list.length;
  if (dom.countSitfisReg) dom.countSitfisReg.textContent = regular;
  if (dom.countSitfisPend) dom.countSitfisPend.textContent = pendencias;
  if (dom.countSitfisProc) dom.countSitfisProc.textContent = processando;
  if (dom.countSitfisNaoCons) dom.countSitfisNaoCons.textContent = naoConsultadas;

  if (dom.badgeSitfisCount) {
    dom.badgeSitfisCount.textContent = `${regular} CNDs`;
  }
}

function renderSitfisTable() {
  if (!dom.tableSitfisBody) return;
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const q = state.searchSitfisQuery;
  const filter = state.currentSitfisFilter;

  const filtered = state.dominioOverview.filter((item) => {
    if (!showInactive && item.empresa.ativo === false) return false;
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const sit = state.sitfisMap.get(cnpj);

    if (filter === "REGULAR" && (!sit || sit.situacao !== "REGULAR")) return false;
    if (filter === "PENDENCIAS" && (!sit || (sit.situacao !== "PENDENCIAS" && sit.situacao !== "IRREGULAR"))) return false;
    if (filter === "PROCESSANDO" && (!sit || sit.situacao !== "PROCESSANDO")) return false;
    if (filter === "NAO_CONSULTADA" && sit) return false;

    if (q) {
      const matchCod = item.empresa.codiEmp.toLowerCase().includes(q);
      const matchRazao = item.empresa.razaoSocial.toLowerCase().includes(q);
      const matchCnpj = item.empresa.cnpj.toLowerCase().includes(q);
      if (!matchCod && !matchRazao && !matchCnpj) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    dom.tableSitfisBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Nenhuma empresa encontrada com os filtros de Situação Fiscal.</td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (const item of filtered) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const sit = state.sitfisMap.get(cnpj);
    const isAtiva = item.empresa.ativo !== false;

    let badgeHtml = '<span class="status-badge badge-sitfis-none">Não Consultada</span>';
    let diagText = "Sem histórico recente";
    let acoesHtml = `
      <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarSitfisSingle('${cnpj}')">
        Solicitar CND
      </button>
    `;

    if (sit) {
      if (sit.situacao === "REGULAR") {
        badgeHtml = '<span class="status-badge badge-sitfis-regular">CND Negativa (Regular)</span>';
        diagText = "Regularidade fiscal plena perante RFB e PGFN";
      } else if (sit.situacao === "PROCESSANDO") {
        badgeHtml = '<span class="status-badge badge-sitfis-processando">Processando</span>';
        diagText = "Protocolo gerado, relatório em compilação";
      } else {
        badgeHtml = '<span class="status-badge badge-sitfis-pendencia">Pendências Identificadas</span>';
        diagText = "Existem débitos ou declarações em atraso";
      }

      acoesHtml = `
        <div style="display: flex; gap: 0.4rem;">
          ${
            sit.tem_pdf
              ? `<button class="btn btn-success" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="baixarSitfisPdf('${cnpj}')">
                  Baixar PDF
                </button>`
              : ""
          }
          <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarSitfisSingle('${cnpj}', true)">
            ↻
          </button>
        </div>
      `;
    }

    html += `
      <tr class="${!isAtiva ? "row-inactive" : ""}">
        <td class="mono"><strong>${item.empresa.codiEmp}</strong></td>
        <td class="mono">${maskCnpj(item.empresa.cnpj)}</td>
        <td><strong>${item.empresa.razaoSocial}</strong></td>
        <td>${badgeHtml}</td>
        <td class="mono" style="font-size: 0.8rem; color: #94A3B8;">${sit?.protocolo || "-"}</td>
        <td style="font-size: 0.8rem;">${formatDateTime(sit?.data_consulta)}</td>
        <td>
          ${
            sit?.data_consulta
              ? '<span class="badge-cache">Cache</span>'
              : '<span style="color: var(--text-muted);">-</span>'
          }
        </td>
        <td style="font-size: 0.8rem; color: #CBD5E1;">${diagText}</td>
        <td>${acoesHtml}</td>
      </tr>
    `;
  }

  dom.tableSitfisBody.innerHTML = html;
}

window.consultarSitfisSingle = async function (cnpj, forceRefresh = false) {
  showLoading(`Solicitando Situação Fiscal / CND no SERPRO para o CNPJ ${maskCnpj(cnpj)}...`);
  try {
    const protoRes = await fetch("/api/sitfis/solicitar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj }),
    });
    const protoData = await protoRes.json();
    if (protoData.error) throw new Error(protoData.error);

    const relRes = await fetch("/api/sitfis/relatorio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, protocolo: protoData.protocolo, forceRefresh }),
    });
    const relData = await relRes.json();
    if (relData.error) throw new Error(relData.error);

    state.sitfisMap.set(cnpj, {
      cnpj,
      protocolo: relData.protocolo,
      situacao: relData.situacao,
      data_consulta: relData.dataConsulta,
      tem_pdf: relData.temPdf ? 1 : 0,
      origem: relData.origem,
    });

    updateSitfisKpis();
    renderSitfisTable();
  } catch (err) {
    alert("Erro ao consultar Situação Fiscal: " + err.message);
  } finally {
    hideLoading();
  }
};

window.baixarSitfisPdf = function (cnpj) {
  window.location.href = `/api/sitfis/download?cnpj=${encodeURIComponent(cnpj)}`;
};

/* ========================================================================= */
/* MÓDULO 3: CAIXA POSTAL FISCAL & DTE                                      */
/* ========================================================================= */

async function loadCaixaPostalData() {
  try {
    const res = await fetch("/api/caixapostal/list");
    const list = await res.json();
    if (Array.isArray(list)) {
      for (const item of list) {
        state.caixaMap.set(item.cnpj, item);
      }
    }
    updateCaixaKpis();
    renderCaixaPostalTable();
  } catch (err) {
    console.warn("Falha ao carregar cache de Caixa Postal:", err);
  }
}

function updateCaixaKpis() {
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);

  let comNovas = 0;
  let totalMensagens = 0;
  let emDia = 0;
  let naoConsultadas = 0;

  for (const item of list) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const cx = state.caixaMap.get(cnpj);
    if (!cx) {
      naoConsultadas++;
    } else if (cx.indicador_novas > 0) {
      comNovas++;
      totalMensagens += cx.qtd_mensagens || 0;
    } else {
      emDia++;
      totalMensagens += cx.qtd_mensagens || 0;
    }
  }

  if (dom.valCaixaTotal) dom.valCaixaTotal.textContent = list.length;
  if (dom.valCaixaNovas) dom.valCaixaNovas.textContent = comNovas;
  if (dom.valCaixaTotalMsg) dom.valCaixaTotalMsg.textContent = totalMensagens;
  if (dom.valCaixaEmDia) dom.valCaixaEmDia.textContent = emDia;

  if (dom.countCaixaAll) dom.countCaixaAll.textContent = list.length;
  if (dom.countCaixaNovas) dom.countCaixaNovas.textContent = comNovas;
  if (dom.countCaixaEmDia) dom.countCaixaEmDia.textContent = emDia;
  if (dom.countCaixaNaoCons) dom.countCaixaNaoCons.textContent = naoConsultadas;

  if (dom.badgeCaixaPostalNovas) {
    dom.badgeCaixaPostalNovas.textContent = `${comNovas} novas`;
    dom.badgeCaixaPostalNovas.style.display = comNovas > 0 ? "inline-block" : "none";
  }
}

function renderCaixaPostalTable() {
  if (!dom.tableCaixaBody) return;
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const q = state.searchCaixaQuery;
  const filter = state.currentCaixaFilter;

  const filtered = state.dominioOverview.filter((item) => {
    if (!showInactive && item.empresa.ativo === false) return false;
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const cx = state.caixaMap.get(cnpj);

    if (filter === "NOVAS" && (!cx || cx.indicador_novas <= 0)) return false;
    if (filter === "EM_DIA" && (!cx || cx.indicador_novas > 0)) return false;
    if (filter === "NAO_CONSULTADA" && cx) return false;

    if (q) {
      const matchCod = item.empresa.codiEmp.toLowerCase().includes(q);
      const matchRazao = item.empresa.razaoSocial.toLowerCase().includes(q);
      const matchCnpj = item.empresa.cnpj.toLowerCase().includes(q);
      if (!matchCod && !matchRazao && !matchCnpj) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    dom.tableCaixaBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Nenhuma empresa encontrada com os filtros de Caixa Postal.</td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (const item of filtered) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const cx = state.caixaMap.get(cnpj);
    const isAtiva = item.empresa.ativo !== false;

    let statusHtml = '<span class="status-badge badge-neutral">Não Verificada</span>';
    let ultNotif = "-";
    let acoesHtml = `
      <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarCaixaSingle('${cnpj}')">
        Verificar Caixa
      </button>
    `;

    if (cx) {
      if (cx.indicador_novas > 0) {
        statusHtml = '<span class="status-badge badge-caixa-novas">Novas Mensagens</span>';
      } else {
        statusHtml = '<span class="status-badge badge-caixa-ok">✓ Caixa em Dia</span>';
      }

      if (cx.mensagens && cx.mensagens.length > 0) {
        ultNotif = cx.mensagens[0].assuntoModelo || cx.mensagens[0].assunto || "Notificação RFB";
      }

      acoesHtml = `
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="abrirModalCaixa('${cnpj}')">
            Ver Mensagens (${cx.qtd_mensagens || 0})
          </button>
          <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarCaixaSingle('${cnpj}', true)">
            ↻
          </button>
        </div>
      `;
    }

    html += `
      <tr class="${!isAtiva ? "row-inactive" : ""}">
        <td class="mono"><strong>${item.empresa.codiEmp}</strong></td>
        <td class="mono">${maskCnpj(item.empresa.cnpj)}</td>
        <td><strong>${item.empresa.razaoSocial}</strong></td>
        <td>${statusHtml}</td>
        <td class="mono">${cx ? cx.qtd_mensagens || 0 : "-"}</td>
        <td style="font-size: 0.8rem; color: #CBD5E1; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ultNotif}">
          ${ultNotif}
        </td>
        <td style="font-size: 0.8rem;">${formatDateTime(cx?.data_consulta)}</td>
        <td>
          ${
            cx?.data_consulta
              ? '<span class="badge-cache">Cache</span>'
              : '<span style="color: var(--text-muted);">-</span>'
          }
        </td>
        <td>${acoesHtml}</td>
      </tr>
    `;
  }

  dom.tableCaixaBody.innerHTML = html;
}

window.consultarCaixaSingle = async function (cnpj, forceRefresh = false) {
  showLoading(`Consultando Caixa Postal e mensagens DTE no SERPRO para ${maskCnpj(cnpj)}...`);
  try {
    const res = await fetch("/api/caixapostal/mensagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, forceRefresh }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    state.caixaMap.set(cnpj, {
      cnpj,
      indicador_novas: data.indicador_novas || (data.mensagens?.some((m) => m.indicadorLeitura === 0) ? 1 : 0),
      qtd_mensagens: data.qtd_mensagens || data.mensagens?.length || 0,
      mensagens: data.mensagens || [],
      data_consulta: data.data_consulta,
    });

    updateCaixaKpis();
    renderCaixaPostalTable();
  } catch (err) {
    alert("Erro ao consultar Caixa Postal: " + err.message);
  } finally {
    hideLoading();
  }
};

window.abrirModalCaixa = function (cnpj) {
  const cx = state.caixaMap.get(cnpj);
  if (!cx || !cx.mensagens || cx.mensagens.length === 0) {
    alert("Nenhuma mensagem encontrada na Caixa Postal desta empresa.");
    return;
  }

  const emp = state.dominioOverview.find((i) => String(i.empresa.cnpj || "").replace(/\D/g, "") === cnpj);
  dom.caixaModalTitle.textContent = `Caixa Postal — ${emp ? emp.empresa.razaoSocial : maskCnpj(cnpj)}`;

  let msgsHtml = '<div class="msg-list-container">';
  for (const m of cx.mensagens) {
    const isUnread = m.indicadorLeitura === 0;
    msgsHtml += `
      <div class="msg-card ${isUnread ? "msg-unread-card" : ""}">
        <div class="msg-header">
          <span class="msg-assunto">${m.assuntoModelo || m.assunto || "Notificação Fiscal RFB"}</span>
          ${
            isUnread
              ? '<span class="status-badge badge-caixa-novas" style="font-size: 0.7rem;">Não Lida</span>'
              : '<span class="status-badge badge-neutral" style="font-size: 0.7rem;">Lida</span>'
          }
        </div>
        <div class="msg-meta">
          <span class="msg-origem">${m.descricaoOrigem || "Receita Federal"}</span>
          <span>Data: ${m.dataEnvio || "-"} ${m.horaEnvio || ""}</span>
          <span>Identificador: ${m.isn || "-"}</span>
        </div>
      </div>
    `;
  }
  msgsHtml += "</div>";

  dom.caixaModalBody.innerHTML = msgsHtml;
  dom.caixaPostalModal.classList.add("active");
};

function closeCaixaModal() {
  dom.caixaPostalModal.classList.remove("active");
}

/* ========================================================================= */
/* MÓDULO 4: PAGAMENTOS ARRECADADOS (DARF / DAS / COMPROVANTES)              */
/* ========================================================================= */

async function loadPagamentosData() {
  try {
    const res = await fetch("/api/pagamentos/list");
    const list = await res.json();
    if (Array.isArray(list)) {
      for (const item of list) {
        state.pagamentosMap.set(item.cnpj, {
          cnpj: item.cnpj,
          pagamentos: item.pagamentos || [],
          data_consulta: item.data_consulta,
        });
      }
    }
    updatePagKpis();
    renderPagamentosTable();
  } catch (err) {
    console.warn("Falha ao carregar cache de Pagamentos:", err);
  }
}

function updatePagKpis() {
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);

  let comPagamento = 0;
  let semPagamento = 0;
  let naoConsultadas = 0;
  let totalValor = 0;
  let totalGuias = 0;

  for (const item of list) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const pag = state.pagamentosMap.get(cnpj);
    if (!pag) {
      naoConsultadas++;
    } else if (pag.pagamentos && pag.pagamentos.length > 0) {
      comPagamento++;
      totalGuias += pag.pagamentos.length;
      for (const p of pag.pagamentos) {
        totalValor += Number(p.valorTotal || 0);
      }
    } else {
      semPagamento++;
    }
  }

  if (dom.valPagTotalEmpresas) dom.valPagTotalEmpresas.textContent = list.length;
  if (dom.valPagComPagamentos) dom.valPagComPagamentos.textContent = comPagamento;
  if (dom.valPagTotalValor) dom.valPagTotalValor.textContent = formatCurrency(totalValor);
  if (dom.valPagTotalGuias) dom.valPagTotalGuias.textContent = totalGuias;

  if (dom.countPagAll) dom.countPagAll.textContent = list.length;
  if (dom.countPagCom) dom.countPagCom.textContent = comPagamento;
  if (dom.countPagSem) dom.countPagSem.textContent = semPagamento;
  if (dom.countPagNaoCons) dom.countPagNaoCons.textContent = naoConsultadas;

  if (dom.badgePagamentosCount) {
    dom.badgePagamentosCount.textContent = formatCurrency(totalValor);
  }
}

function renderPagamentosTable() {
  if (!dom.tablePagBody) return;
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const q = state.searchPagQuery;
  const filter = state.currentPagFilter;

  const filtered = state.dominioOverview.filter((item) => {
    if (!showInactive && item.empresa.ativo !== false) return false;
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const pag = state.pagamentosMap.get(cnpj);

    if (filter === "COM_PAGAMENTO" && (!pag || !pag.pagamentos || pag.pagamentos.length === 0)) return false;
    if (filter === "SEM_PAGAMENTO" && (!pag || (pag.pagamentos && pag.pagamentos.length > 0))) return false;
    if (filter === "NAO_CONSULTADA" && pag) return false;

    if (q) {
      const matchCod = item.empresa.codiEmp.toLowerCase().includes(q);
      const matchRazao = item.empresa.razaoSocial.toLowerCase().includes(q);
      const matchCnpj = item.empresa.cnpj.toLowerCase().includes(q);
      if (!matchCod && !matchRazao && !matchCnpj) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    dom.tablePagBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Nenhuma empresa encontrada com os filtros de Pagamentos.</td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (const item of filtered) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const pag = state.pagamentosMap.get(cnpj);
    const isAtiva = item.empresa.ativo !== false;

    let somaTotal = 0;
    let ultData = "-";
    let qtd = 0;
    let acoesHtml = `
      <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarPagamentosSingle('${cnpj}')">
        Consultar Pagamentos
      </button>
    `;

    if (pag && pag.pagamentos) {
      qtd = pag.pagamentos.length;
      for (const p of pag.pagamentos) {
        somaTotal += Number(p.valorTotal || 0);
      }
      if (qtd > 0) {
        ultData = pag.pagamentos[0].dataArrecadacao || "-";
      }

      acoesHtml = `
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="abrirModalPagamentos('${cnpj}')">
            Ver Guias (${qtd})
          </button>
          <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarPagamentosSingle('${cnpj}', true)">
            ↻
          </button>
        </div>
      `;
    }

    html += `
      <tr class="${!isAtiva ? "row-inactive" : ""}">
        <td class="mono"><strong>${item.empresa.codiEmp}</strong></td>
        <td class="mono">${maskCnpj(item.empresa.cnpj)}</td>
        <td><strong>${item.empresa.razaoSocial}</strong></td>
        <td class="mono">${pag ? qtd : "-"}</td>
        <td class="mono"><strong>${formatCurrency(somaTotal)}</strong></td>
        <td style="font-size: 0.8rem;">${ultData}</td>
        <td style="font-size: 0.8rem;">${formatDateTime(pag?.data_consulta)}</td>
        <td>
          ${
            pag?.data_consulta
              ? '<span class="badge-cache">Cache</span>'
              : '<span style="color: var(--text-muted);">-</span>'
          }
        </td>
        <td>${acoesHtml}</td>
      </tr>
    `;
  }

  dom.tablePagBody.innerHTML = html;
}

window.consultarPagamentosSingle = async function (cnpj, forceRefresh = false) {
  showLoading(`Consultando tributos e guias arrecadadas no SERPRO para ${maskCnpj(cnpj)}...`);
  try {
    const res = await fetch("/api/pagamentos/consultar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, forceRefresh }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    state.pagamentosMap.set(cnpj, {
      cnpj,
      pagamentos: data.pagamentos || [],
      data_consulta: data.dataConsulta || new Date().toISOString(),
    });

    updatePagKpis();
    renderPagamentosTable();
  } catch (err) {
    alert("Erro ao consultar pagamentos arrecadados: " + err.message);
  } finally {
    hideLoading();
  }
};

window.abrirModalPagamentos = function (cnpj) {
  const pag = state.pagamentosMap.get(cnpj);
  if (!pag || !pag.pagamentos || pag.pagamentos.length === 0) {
    alert("Nenhum pagamento arrecadado localizado para esta empresa.");
    return;
  }

  const emp = state.dominioOverview.find((i) => String(i.empresa.cnpj || "").replace(/\D/g, "") === cnpj);
  dom.pagamentosModalTitle.textContent = `Tributos Arrecadados — ${emp ? emp.empresa.razaoSocial : maskCnpj(cnpj)}`;

  let tableHtml = `
    <div class="pag-table-container">
      <table class="sub-table" style="width: 100%;">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Nº Documento</th>
            <th>Período Apuração</th>
            <th>Data Arrecadação</th>
            <th>Código Receita</th>
            <th>Valor Total</th>
            <th>Comprovante</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const p of pag.pagamentos) {
    tableHtml += `
      <tr>
        <td><strong>${p.tipoDocumento || "DARF"}</strong></td>
        <td class="mono">${p.numeroDocumento || "-"}</td>
        <td class="mono">${p.periodoApuracao || "-"}</td>
        <td class="mono">${p.dataArrecadacao || "-"}</td>
        <td class="mono">${p.receitaPrincipalCodigo || "-"}</td>
        <td class="mono"><strong>${formatCurrency(p.valorTotal)}</strong></td>
        <td>
          <button class="btn btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.72rem;" onclick="baixarComprovante('${cnpj}', '${p.numeroDocumento}')">
            Baixar PDF
          </button>
        </td>
      </tr>
    `;
  }

  tableHtml += `
        </tbody>
      </table>
    </div>
  `;

  dom.pagamentosModalBody.innerHTML = tableHtml;
  dom.pagamentosModal.classList.add("active");
};

window.baixarComprovante = async function (cnpj, numeroDocumento) {
  showLoading(`Emitindo Comprovante de Arrecadação nº ${numeroDocumento}...`);
  try {
    const res = await fetch("/api/pagamentos/comprovante", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, numeroDocumento }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.pdfBase64) throw new Error("Comprovante PDF não retornado pela API.");
    downloadBase64Pdf(data.pdfBase64, `comprovante_${cnpj}_${numeroDocumento}.pdf`);
  } catch (err) {
    alert("Erro ao baixar comprovante: " + err.message);
  } finally {
    hideLoading();
  }
};

function closePagamentosModal() {
  dom.pagamentosModal.classList.remove("active");
}

/* ========================================================================= */
/* MÓDULO 5: SIMPLES NACIONAL (PGDAS-D / DEFIS)                              */
/* ========================================================================= */

async function loadSimplesData() {
  try {
    const res = await fetch("/api/simples/list");
    const list = await res.json();
    if (Array.isArray(list)) {
      for (const item of list) {
        state.simplesMap.set(item.cnpj, item);
      }
    }
    updateSimplesKpis();
    renderSimplesTable();
  } catch (err) {
    console.warn("Falha ao carregar cache do Simples Nacional:", err);
  }
}

function updateSimplesKpis() {
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);

  let declaradas = 0;
  let pagas = 0;
  let emAberto = 0;
  let defisCount = 0;
  let naoConsultadas = 0;

  for (const item of list) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const sn = state.simplesMap.get(cnpj);
    if (!sn) {
      naoConsultadas++;
    } else {
      if (sn.declaracoes && sn.declaracoes.length > 0) {
        declaradas++;
        const hasPago = sn.declaracoes.some((d) => d.dasPago === true);
        if (hasPago) pagas++;
        else emAberto++;
      } else {
        naoConsultadas++;
      }
      if (sn.defis && sn.defis.length > 0) {
        defisCount += sn.defis.length;
      }
    }
  }

  if (dom.valSimplesTotal) dom.valSimplesTotal.textContent = list.length;
  if (dom.valSimplesDeclaradas) dom.valSimplesDeclaradas.textContent = declaradas;
  if (dom.valSimplesPagas) dom.valSimplesPagas.textContent = pagas;
  if (dom.valSimplesEmAberto) dom.valSimplesEmAberto.textContent = emAberto;
  if (dom.valSimplesDefis) dom.valSimplesDefis.textContent = defisCount;

  if (dom.countSimplesAll) dom.countSimplesAll.textContent = list.length;
  if (dom.countSimplesPago) dom.countSimplesPago.textContent = pagas;
  if (dom.countSimplesAberto) dom.countSimplesAberto.textContent = emAberto;
  if (dom.countSimplesNaoCons) dom.countSimplesNaoCons.textContent = naoConsultadas;

  if (dom.badgeSimplesCount) {
    dom.badgeSimplesCount.textContent = `${declaradas} PGDAS`;
  }
}

function renderSimplesTable() {
  if (!dom.tableSimplesBody) return;
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const q = state.searchSimplesQuery;
  const filter = state.currentSimplesFilter;

  const filtered = state.dominioOverview.filter((item) => {
    if (!showInactive && item.empresa.ativo === false) return false;
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const sn = state.simplesMap.get(cnpj);

    const hasPago = sn?.declaracoes?.some((d) => d.dasPago === true);
    const hasAberto = sn?.declaracoes?.some((d) => d.dasPago === false);

    if (filter === "PAGO" && !hasPago) return false;
    if (filter === "EM_ABERTO" && (!hasAberto || hasPago)) return false;
    if (filter === "NAO_CONSULTADA" && sn?.declaracoes?.length > 0) return false;

    if (q) {
      const matchCod = item.empresa.codiEmp.toLowerCase().includes(q);
      const matchRazao = item.empresa.razaoSocial.toLowerCase().includes(q);
      const matchCnpj = item.empresa.cnpj.toLowerCase().includes(q);
      if (!matchCod && !matchRazao && !matchCnpj) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    dom.tableSimplesBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Nenhuma empresa encontrada com os filtros do Simples Nacional.</td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (const item of filtered) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const sn = state.simplesMap.get(cnpj);
    const isAtiva = item.empresa.ativo !== false;

    const paFormatted = state.competencia ? state.competencia.replace("-", "") : "202608";
    const decl = sn?.declaracoes?.find((d) => d.periodoApuracao === paFormatted) || sn?.declaracoes?.[0];

    let statusBadge = '<span class="status-badge badge-neutral">Não Consultada</span>';
    let acoesHtml = `
      <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarSimplesSingle('${cnpj}')">
        Consultar PGDAS
      </button>
    `;

    if (decl) {
      if (decl.dasPago) {
        statusBadge = '<span class="status-badge badge-success">DAS Pago</span>';
      } else {
        statusBadge = '<span class="status-badge badge-warning">Em Aberto</span>';
      }

      acoesHtml = `
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <button class="btn btn-success" style="padding: 0.3rem 0.55rem; font-size: 0.72rem;" onclick="emitirDasSimples('${cnpj}', '${decl.periodoApuracao}')">
            Emitir DAS
          </button>
          <button class="btn btn-primary" style="padding: 0.3rem 0.55rem; font-size: 0.72rem;" onclick="abrirModalSimples('${cnpj}')">
            Detalhes
          </button>
          <button class="btn btn-secondary" style="padding: 0.3rem 0.55rem; font-size: 0.72rem;" onclick="consultarSimplesSingle('${cnpj}', true)">
            ↻
          </button>
        </div>
      `;
    }

    html += `
      <tr class="${!isAtiva ? "row-inactive" : ""}">
        <td class="mono"><strong>${item.empresa.codiEmp}</strong></td>
        <td class="mono">${maskCnpj(item.empresa.cnpj)}</td>
        <td><strong>${item.empresa.razaoSocial}</strong></td>
        <td class="mono">${decl ? formatPa(decl.periodoApuracao) : formatPa(paFormatted)}</td>
        <td class="mono" style="font-size: 0.8rem; color: #94A3B8;">${decl?.numeroDeclaracao || "-"}</td>
        <td>${statusBadge}</td>
        <td style="font-size: 0.8rem;">${decl?.dataHoraTransmissao ? formatDateTime(decl.dataHoraTransmissao) : "-"}</td>
        <td>
          ${
            sn?.data_consulta
              ? '<span class="badge-cache">Cache</span>'
              : '<span style="color: var(--text-muted);">-</span>'
          }
        </td>
        <td>${acoesHtml}</td>
      </tr>
    `;
  }

  dom.tableSimplesBody.innerHTML = html;
}

window.consultarSimplesSingle = async function (cnpj, forceRefresh = false) {
  const pa = state.competencia ? state.competencia.replace("-", "") : "202608";
  showLoading(`Consultando declaração PGDAS-D e situação no SERPRO para ${maskCnpj(cnpj)}...`);
  try {
    const res = await fetch("/api/simples/declaracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, periodoApuracao: pa, forceRefresh }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const existing = state.simplesMap.get(cnpj) || {};
    state.simplesMap.set(cnpj, {
      ...existing,
      cnpj,
      periodo_apuracao: pa,
      declaracoes: data.declaracoes || [],
      data_consulta: new Date().toISOString(),
    });

    updateSimplesKpis();
    renderSimplesTable();
  } catch (err) {
    alert("Erro ao consultar Simples Nacional: " + err.message);
  } finally {
    hideLoading();
  }
};

window.emitirDasSimples = async function (cnpj, periodoApuracao) {
  showLoading(`Emitindo DAS oficial PGDAS-D para o período ${formatPa(periodoApuracao)}...`);
  try {
    const res = await fetch("/api/simples/gerar-das", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, periodoApuracao }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.pdfBase64) throw new Error("A API não retornou o arquivo PDF do DAS.");
    downloadBase64Pdf(data.pdfBase64, `das_simples_${cnpj}_${periodoApuracao}.pdf`);
  } catch (err) {
    alert("Erro ao emitir DAS do Simples Nacional: " + err.message);
  } finally {
    hideLoading();
  }
};

window.abrirModalSimples = function (cnpj) {
  const sn = state.simplesMap.get(cnpj);
  const emp = state.dominioOverview.find((i) => String(i.empresa.cnpj || "").replace(/\D/g, "") === cnpj);
  dom.simplesModalTitle.textContent = `Simples Nacional — ${emp ? emp.empresa.razaoSocial : maskCnpj(cnpj)}`;

  let contentHtml = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div>
        <h4 style="color: #38BDF8; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.5rem;">
          Histórico de Declarações PGDAS-D Transmitidas
        </h4>
        <table class="sub-table" style="width: 100%;">
          <thead>
            <tr>
              <th>Período</th>
              <th>Tipo Operação</th>
              <th>Nº Declaração</th>
              <th>Nº DAS</th>
              <th>Status Pagamento</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (sn && sn.declaracoes && sn.declaracoes.length > 0) {
    for (const d of sn.declaracoes) {
      contentHtml += `
        <tr>
          <td class="mono"><strong>${formatPa(d.periodoApuracao)}</strong></td>
          <td>${d.tipoOperacao || "Original"}</td>
          <td class="mono">${d.numeroDeclaracao || "-"}</td>
          <td class="mono">${d.numeroDas || "-"}</td>
          <td>
            ${
              d.dasPago
                ? '<span class="status-badge badge-success" style="font-size: 0.72rem;">Pago</span>'
                : '<span class="status-badge badge-warning" style="font-size: 0.72rem;">Em Aberto</span>'
            }
          </td>
          <td>
            <button class="btn btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.72rem;" onclick="emitirDasSimples('${cnpj}', '${d.periodoApuracao}')">
              Gerar DAS
            </button>
          </td>
        </tr>
      `;
    }
  } else {
    contentHtml += `<tr><td colspan="6" class="empty-state">Nenhuma declaração PGDAS-D em cache.</td></tr>`;
  }

  contentHtml += `
          </tbody>
        </table>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-medium);">
        <div>
          <h5 style="color: #A855F7; font-size: 0.85rem; text-transform: uppercase;">Declaração Anual DEFIS</h5>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">Verifique se a DEFIS anual do contribuinte foi entregue à RFB.</p>
        </div>
        <button class="btn btn-primary" style="font-size: 0.8rem;" onclick="consultarDefisModal('${cnpj}')">
          Consultar DEFIS
        </button>
      </div>
      <div id="defisResultContainer"></div>
    </div>
  `;

  dom.simplesModalBody.innerHTML = contentHtml;
  dom.simplesModal.classList.add("active");
};

window.consultarDefisModal = async function (cnpj) {
  const container = document.getElementById("defisResultContainer");
  if (container) container.innerHTML = `<div style="color: #94A3B8; font-size: 0.85rem; padding: 0.5rem 0;">Consultando DEFIS no SERPRO...</div>`;
  try {
    const res = await fetch("/api/simples/defis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, forceRefresh: true }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const existing = state.simplesMap.get(cnpj) || {};
    state.simplesMap.set(cnpj, { ...existing, defis: data.defis || [] });
    updateSimplesKpis();

    if (container) {
      if (!data.defis || data.defis.length === 0) {
        container.innerHTML = `<div style="color: #FBBF24; font-size: 0.85rem;">Nenhuma declaração DEFIS localizada na Receita Federal.</div>`;
        return;
      }
      let html = `
        <table class="sub-table" style="width: 100%; margin-top: 0.5rem;">
          <thead>
            <tr>
              <th>Ano-Calendário</th>
              <th>Identificador DEFIS</th>
              <th>Tipo</th>
              <th>Data/Hora Transmissão</th>
            </tr>
          </thead>
          <tbody>
      `;
      for (const df of data.defis) {
        html += `
          <tr>
            <td><strong>${df.anoCalendario}</strong></td>
            <td class="mono">${df.idDefis}</td>
            <td>${df.tipo}</td>
            <td style="font-size: 0.8rem;">${df.dataHora}</td>
          </tr>
        `;
      }
      html += `</tbody></table>`;
      container.innerHTML = html;
    }
  } catch (err) {
    if (container) container.innerHTML = `<div style="color: #EF4444; font-size: 0.85rem;">Erro ao consultar DEFIS: ${err.message}</div>`;
  }
};

function closeSimplesModal() {
  dom.simplesModal.classList.remove("active");
}

/* ========================================================================= */
/* MÓDULO 6: GESTOR DE PARCELAMENTOS FISCAIS (PARCSN / PARCMEI)             */
/* ========================================================================= */

async function loadParcelamentosData() {
  try {
    const res = await fetch("/api/parcelamentos/list");
    const list = await res.json();
    if (Array.isArray(list)) {
      for (const item of list) {
        state.parcelamentosMap.set(item.cnpj, item);
      }
    }
    updateParcKpis();
    renderParcelamentosTable();
  } catch (err) {
    console.warn("Falha ao carregar cache de Parcelamentos:", err);
  }
}

function updateParcKpis() {
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);

  let ativos = 0;
  let parcelasTotal = 0;
  let semAcordo = 0;
  let naoConsultadas = 0;

  for (const item of list) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const prc = state.parcelamentosMap.get(cnpj);
    if (!prc) {
      naoConsultadas++;
    } else if (prc.pedidos && prc.pedidos.length > 0) {
      ativos++;
      if (prc.parcelas) parcelasTotal += prc.parcelas.length;
    } else {
      semAcordo++;
    }
  }

  if (dom.valParcTotal) dom.valParcTotal.textContent = list.length;
  if (dom.valParcAtivos) dom.valParcAtivos.textContent = ativos;
  if (dom.valParcParcelas) dom.valParcParcelas.textContent = parcelasTotal;
  if (dom.valParcSemAcordo) dom.valParcSemAcordo.textContent = semAcordo;

  if (dom.countParcAll) dom.countParcAll.textContent = list.length;
  if (dom.countParcCom) dom.countParcCom.textContent = ativos;
  if (dom.countParcComParc) dom.countParcComParc.textContent = parcelasTotal;
  if (dom.countParcNaoCons) dom.countParcNaoCons.textContent = naoConsultadas;

  if (dom.badgeParcelamentosCount) {
    dom.badgeParcelamentosCount.textContent = `${ativos} ativos`;
  }
}

function renderParcelamentosTable() {
  if (!dom.tableParcBody) return;
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const q = state.searchParcQuery;
  const filter = state.currentParcFilter;

  const filtered = state.dominioOverview.filter((item) => {
    if (!showInactive && item.empresa.ativo === false) return false;
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const prc = state.parcelamentosMap.get(cnpj);

    const hasAcordo = prc?.pedidos?.length > 0;
    const hasParcela = prc?.parcelas?.length > 0;

    if (filter === "COM_ACORDO" && !hasAcordo) return false;
    if (filter === "COM_PARCELA" && !hasParcela) return false;
    if (filter === "NAO_CONSULTADA" && prc) return false;

    if (q) {
      const matchCod = item.empresa.codiEmp.toLowerCase().includes(q);
      const matchRazao = item.empresa.razaoSocial.toLowerCase().includes(q);
      const matchCnpj = item.empresa.cnpj.toLowerCase().includes(q);
      if (!matchCod && !matchRazao && !matchCnpj) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    dom.tableParcBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Nenhum parcelamento encontrado com os filtros selecionados.</td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (const item of filtered) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const prc = state.parcelamentosMap.get(cnpj);
    const isAtiva = item.empresa.ativo !== false;

    const pedido = prc?.pedidos?.[0];
    const qtdParcelas = prc?.parcelas?.length || 0;

    let statusBadge = '<span class="status-badge badge-neutral">Não Verificado</span>';
    let acoesHtml = `
      <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarParcelamentoSingle('${cnpj}')">
        Consultar Acordo
      </button>
    `;

    if (pedido) {
      statusBadge = '<span class="status-badge badge-success">Acordo Ativo</span>';
      acoesHtml = `
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="abrirModalParcelamento('${cnpj}')">
            Ver Parcelas (${qtdParcelas})
          </button>
          <button class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarParcelamentoSingle('${cnpj}', true)">
            ↻
          </button>
        </div>
      `;
    } else if (prc && prc.pedidos?.length === 0) {
      statusBadge = '<span class="status-badge badge-neutral">Sem Acordo</span>';
    }

    html += `
      <tr class="${!isAtiva ? "row-inactive" : ""}">
        <td class="mono"><strong>${item.empresa.codiEmp}</strong></td>
        <td class="mono">${maskCnpj(item.empresa.cnpj)}</td>
        <td><strong>${item.empresa.razaoSocial}</strong></td>
        <td><strong>${prc?.modalidade || "PARCSN"}</strong></td>
        <td class="mono" style="font-size: 0.8rem; color: #94A3B8;">${pedido?.numero || "-"}</td>
        <td>${statusBadge}</td>
        <td class="mono"><strong>${qtdParcelas} parcela(s)</strong></td>
        <td style="font-size: 0.8rem;">${formatDateTime(prc?.data_consulta)}</td>
        <td>${acoesHtml}</td>
      </tr>
    `;
  }

  dom.tableParcBody.innerHTML = html;
}

window.consultarParcelamentoSingle = async function (cnpj, forceRefresh = false) {
  showLoading(`Consultando parcelamentos e parcelas disponíveis no SERPRO para ${maskCnpj(cnpj)}...`);
  try {
    const pedRes = await fetch("/api/parcelamentos/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, modalidade: "PARCSN", forceRefresh }),
    });
    const pedData = await pedRes.json();
    if (pedData.error) throw new Error(pedData.error);

    const parcRes = await fetch("/api/parcelamentos/parcelas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, modalidade: "PARCSN", forceRefresh }),
    });
    const parcData = await parcRes.json();
    if (parcData.error) throw new Error(parcData.error);

    state.parcelamentosMap.set(cnpj, {
      cnpj,
      modalidade: "PARCSN",
      pedidos: pedData.pedidos || [],
      parcelas: parcData.parcelas || [],
      data_consulta: new Date().toISOString(),
    });

    updateParcKpis();
    renderParcelamentosTable();
  } catch (err) {
    alert("Erro ao consultar parcelamentos: " + err.message);
  } finally {
    hideLoading();
  }
};

window.abrirModalParcelamento = function (cnpj) {
  const prc = state.parcelamentosMap.get(cnpj);
  const emp = state.dominioOverview.find((i) => String(i.empresa.cnpj || "").replace(/\D/g, "") === cnpj);
  dom.parcModalTitle.textContent = `Parcelamento Fiscal — ${emp ? emp.empresa.razaoSocial : maskCnpj(cnpj)}`;

  let html = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div>
        <h4 style="color: #38BDF8; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.5rem;">
          Parcelas Disponíveis para Emissão do DAS
        </h4>
        <table class="sub-table" style="width: 100%;">
          <thead>
            <tr>
              <th>Parcela (Mês/Ano)</th>
              <th>Valor (R$)</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (prc && prc.parcelas && prc.parcelas.length > 0) {
    for (const p of prc.parcelas) {
      html += `
        <tr>
          <td class="mono"><strong>${formatPa(p.parcela)}</strong></td>
          <td class="mono"><strong>${formatCurrency(p.valor)}</strong></td>
          <td>
            <button class="btn btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.72rem;" onclick="emitirDasParcela('${cnpj}', '${p.parcela}', '${prc.modalidade || "PARCSN"}')">
              Baixar DAS (PDF)
            </button>
          </td>
        </tr>
      `;
    }
  } else {
    html += `<tr><td colspan="3" class="empty-state">Nenhuma parcela com emissão pendente neste momento.</td></tr>`;
  }

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  dom.parcModalBody.innerHTML = html;
  dom.parcelamentoModal.classList.add("active");
};

window.emitirDasParcela = async function (cnpj, parcela, modalidade = "PARCSN") {
  showLoading(`Emitindo DAS da parcela ${formatPa(parcela)} do acordo ${modalidade}...`);
  try {
    const res = await fetch("/api/parcelamentos/gerar-das", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, parcela, modalidade }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.pdfBase64) throw new Error("A API não retornou o PDF do DAS de parcelamento.");
    downloadBase64Pdf(data.pdfBase64, `das_parcelamento_${cnpj}_${parcela}.pdf`);
  } catch (err) {
    alert("Erro ao emitir DAS do parcelamento: " + err.message);
  } finally {
    hideLoading();
  }
};

function closeParcModal() {
  dom.parcelamentoModal.classList.remove("active");
}

/* ========================================================================= */
/* MÓDULO: GESTÃO & RASTREIO DE PARCELAMENTOS PGFN (DÍVIDA ATIVA DA UNIÃO)   */
/* ========================================================================= */

async function loadParcelamentosPgfn() {
  try {
    const res = await fetch("/api/parcelamentos-pgfn");
    const list = await res.json();
    if (Array.isArray(list)) {
      state.pgfnList = list;
    } else {
      state.pgfnList = [];
    }
    updatePgfnKpis();
    renderTablePgfn();
  } catch (err) {
    console.warn("Falha ao carregar acordos PGFN:", err);
  }
}

function updatePgfnKpis() {
  const list = state.pgfnList || [];
  let pagos = 0;
  let emDia = 0;
  let risco = 0;

  for (const p of list) {
    if (p.status === "PAGO_NO_MES") pagos++;
    else if (p.status === "RISCO_RESCISAO" || p.status === "PENDENTE") risco++;
    else emDia++;
  }

  if (dom.valPgfnTotal) dom.valPgfnTotal.textContent = list.length;
  if (dom.valPgfnPagos) dom.valPgfnPagos.textContent = pagos;
  if (dom.valPgfnEmDia) dom.valPgfnEmDia.textContent = emDia;
  if (dom.valPgfnRisco) dom.valPgfnRisco.textContent = risco;
}

function renderTablePgfn() {
  if (!dom.tablePgfnBody) return;
  const list = state.pgfnList || [];

  if (list.length === 0) {
    dom.tablePgfnBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          Nenhum acordo de parcelamento PGFN cadastrado. Clique no botão acima "+ Novo Acordo PGFN" para monitorar.
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (const p of list) {
    let statusBadge = `<span class="badge-pgfn-emdia">Em Dia</span>`;
    if (p.status === "PAGO_NO_MES") {
      statusBadge = `<span class="badge-pgfn-pago">Quitado no Mês</span>`;
    } else if (p.status === "PENDENTE") {
      statusBadge = `<span class="badge-pgfn-pendente">Pendente</span>`;
    } else if (p.status === "RISCO_RESCISAO") {
      statusBadge = `<span class="badge-pgfn-risco">Risco de Rescisão</span>`;
    }

    const auditStr = p.ultima_auditoria
      ? `<span style="font-size:0.75rem; color:#94A3B8;">${formatDateTime(p.ultima_auditoria)}</span>`
      : `<span style="font-size:0.75rem; color:#64748B;">Pendente de auditoria</span>`;

    const detalheStr = p.detalhes_auditoria
      ? `<div style="font-size:0.72rem; color:#94A3B8; margin-top:0.2rem; max-width:260px;">${p.detalhes_auditoria}</div>`
      : "";

    html += `
      <tr>
        <td>
          <div style="font-weight:600; color:#F8FAFC;">${p.razao_social || maskCnpj(p.cnpj)}</div>
          <div class="mono" style="font-size:0.75rem; color:#64748B;">${maskCnpj(p.cnpj)}</div>
        </td>
        <td class="mono font-bold" style="color:#60A5FA;">${p.numero_negociacao}</td>
        <td><span style="font-size:0.85rem;">${p.modalidade}</span></td>
        <td class="mono font-bold" style="color:#34D399;">${formatCurrency(p.valor_parcela || 0)}</td>
        <td><span style="font-size:0.85rem;">Dia ${p.dia_vencimento || 30}</span></td>
        <td class="mono" style="font-size:0.8rem; color:#94A3B8;">${p.codigo_receita || "1734"}</td>
        <td>${statusBadge}</td>
        <td>${auditStr}${detalheStr}</td>
        <td>
          <div style="display:flex; gap:0.4rem; align-items:center;">
            <button class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="auditarAcordoPgfn(${p.id})">
              Auditar
            </button>
            <button class="btn btn-primary" style="padding:0.35rem 0.65rem; font-size:0.75rem;" onclick="prepararSicalcParaPgfn('${p.cnpj}', '${p.codigo_receita || "1734"}', ${p.valor_parcela || 0})">
              DARF Sicalc
            </button>
            <button class="btn btn-danger" style="padding:0.35rem 0.5rem; font-size:0.75rem;" onclick="excluirAcordoPgfn(${p.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  dom.tablePgfnBody.innerHTML = html;
}

window.abrirModalNovoAcordoPgfn = function (id) {
  if (dom.pgfnEmpresaSelect) {
    let options = `<option value="">Selecione uma empresa ativa do Domínio...</option>`;
    for (const item of state.dominioOverview) {
      if (item.empresa && item.empresa.ativo !== false) {
        const cnpjClean = String(item.empresa.cnpj || "").replace(/\D/g, "");
        options += `<option value="${cnpjClean}" data-razao="${item.empresa.razaoSocial || ""}">
          ${item.empresa.codiEmp} - ${item.empresa.razaoSocial} (${maskCnpj(cnpjClean)})
        </option>`;
      }
    }
    dom.pgfnEmpresaSelect.innerHTML = options;
  }

  if (id) {
    const p = (state.pgfnList || []).find((x) => x.id === id);
    if (p) {
      if (dom.pgfnId) dom.pgfnId.value = p.id;
      if (dom.pgfnEmpresaSelect) dom.pgfnEmpresaSelect.value = p.cnpj;
      if (dom.pgfnNumeroNegociacao) dom.pgfnNumeroNegociacao.value = p.numero_negociacao;
      if (dom.pgfnModalidade) dom.pgfnModalidade.value = p.modalidade;
      if (dom.pgfnValorParcela) dom.pgfnValorParcela.value = p.valor_parcela;
      if (dom.pgfnDiaVencimento) dom.pgfnDiaVencimento.value = p.dia_vencimento;
      if (dom.pgfnCodigoReceita) dom.pgfnCodigoReceita.value = p.codigo_receita || "1734";
      if (dom.pgfnObservacoes) dom.pgfnObservacoes.value = p.observacoes || "";
    }
  } else {
    if (dom.pgfnId) dom.pgfnId.value = "";
    if (dom.pgfnEmpresaSelect) dom.pgfnEmpresaSelect.value = "";
    if (dom.pgfnNumeroNegociacao) dom.pgfnNumeroNegociacao.value = "";
    if (dom.pgfnValorParcela) dom.pgfnValorParcela.value = "";
    if (dom.pgfnDiaVencimento) dom.pgfnDiaVencimento.value = "30";
    if (dom.pgfnCodigoReceita) dom.pgfnCodigoReceita.value = "1734";
    if (dom.pgfnObservacoes) dom.pgfnObservacoes.value = "";
  }

  if (dom.novoAcordoPgfnModal) dom.novoAcordoPgfnModal.classList.add("active");
};

window.fecharModalPgfn = function () {
  if (dom.novoAcordoPgfnModal) dom.novoAcordoPgfnModal.classList.remove("active");
};

window.onSelectEmpresaPgfn = function (el) {
  // Eventual auto-preenchimento
};

window.salvarAcordoPgfn = async function (e) {
  if (e) e.preventDefault();
  const select = dom.pgfnEmpresaSelect;
  const opt = select?.selectedOptions?.[0];
  const cnpj = (select?.value || "").replace(/\D/g, "");
  const razaoSocial = opt?.getAttribute("data-razao") || "";
  const numero_negociacao = (dom.pgfnNumeroNegociacao?.value || "").trim();
  const modalidade = dom.pgfnModalidade?.value || "Transação por Edital PGDAU";
  const valor_parcela = Number(dom.pgfnValorParcela?.value || 0);
  const dia_vencimento = Number(dom.pgfnDiaVencimento?.value || 30);
  const codigo_receita = (dom.pgfnCodigoReceita?.value || "1734").trim();
  const observacoes = (dom.pgfnObservacoes?.value || "").trim();
  const idVal = dom.pgfnId?.value ? Number(dom.pgfnId.value) : undefined;

  if (!cnpj || !numero_negociacao) {
    alert("Por favor selecione a empresa e informe o número da negociação.");
    return;
  }

  showLoading("Salvando acordo de parcelamento PGFN...");
  try {
    const res = await fetch("/api/parcelamentos-pgfn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: idVal,
        cnpj,
        razao_social: razaoSocial,
        numero_negociacao,
        modalidade,
        valor_parcela,
        dia_vencimento,
        codigo_receita,
        observacoes,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    fecharModalPgfn();
    await loadParcelamentosPgfn();
  } catch (err) {
    alert("Erro ao salvar acordo PGFN: " + err.message);
  } finally {
    hideLoading();
  }
};

window.auditarAcordoPgfn = async function (id) {
  showLoading("Auditando recolhimentos bancários e situação fiscal na PGFN...");
  try {
    const res = await fetch(`/api/parcelamentos-pgfn/${id}/auditar`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    await loadParcelamentosPgfn();
    alert(`Resultado da Auditoria PGFN:\n\nStatus: ${data.status}\nDiagnóstico: ${data.detalhes_auditoria || "Em conformidade"}`);
  } catch (err) {
    alert("Erro ao auditar acordo PGFN: " + err.message);
  } finally {
    hideLoading();
  }
};

window.prepararSicalcParaPgfn = function (cnpj, codigoReceita = "1734", valor = 0) {
  if (typeof switchTab === "function") {
    switchTab("sicalc");
  }
  if (dom.sicalcCnpj) dom.sicalcCnpj.value = maskCnpj(cnpj);
  if (dom.sicalcReceita) dom.sicalcReceita.value = codigoReceita;
  if (dom.sicalcValor) dom.sicalcValor.value = valor > 0 ? valor : "";
  if (dom.sicalcPA) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    dom.sicalcPA.value = `${now.getFullYear()}${mm}`;
    dom.sicalcPA.focus();
  }
};

window.excluirAcordoPgfn = async function (id) {
  if (!confirm("Tem certeza que deseja remover este acordo de parcelamento PGFN da listagem de monitoramento?")) {
    return;
  }
  showLoading("Removendo acordo PGFN...");
  try {
    const res = await fetch(`/api/parcelamentos-pgfn/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    await loadParcelamentosPgfn();
  } catch (err) {
    alert("Erro ao remover: " + err.message);
  } finally {
    hideLoading();
  }
};

/* ========================================================================= */
/* MÓDULO: PROCURAÇÕES ELETRÔNICAS RFB & REDESIM                             */
/* ========================================================================= */

async function loadProcuracoesData() {
  try {
    const res = await fetch("/api/procuracoes/lista");
    const list = await res.json();
    if (Array.isArray(list)) {
      for (const item of list) {
        state.procuracoesMap.set(item.cnpj, item);
      }
    }
    updateProcKpis();
    renderProcuracoesTable();
  } catch (err) {
    console.warn("Falha ao carregar cache de Procurações:", err);
  }
}

function updateProcKpis() {
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const list = state.dominioOverview.filter((item) => showInactive || item.empresa.ativo !== false);

  let vigentes = 0;
  let alerta = 0;
  let critica = 0;
  let naoCons = 0;

  for (const item of list) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const proc = state.procuracoesMap.get(cnpj);
    if (!proc) {
      naoCons++;
    } else if (proc.situacao === "EXPIRADA" || proc.situacao === "CRITICA") {
      critica++;
    } else if (proc.situacao === "ALERTA") {
      alerta++;
    } else {
      vigentes++;
    }
  }

  if (dom.valProcTotal) dom.valProcTotal.textContent = list.length - naoCons;
  if (dom.valProcVigentes) dom.valProcVigentes.textContent = vigentes;
  if (dom.valProcAlerta) dom.valProcAlerta.textContent = alerta;
  if (dom.valProcCritica) dom.valProcCritica.textContent = critica;

  if (dom.countProcAll) dom.countProcAll.textContent = list.length;
  if (dom.countProcCritica) dom.countProcCritica.textContent = critica;
  if (dom.countProcAlerta) dom.countProcAlerta.textContent = alerta;
  if (dom.countProcVigente) dom.countProcVigente.textContent = vigentes;
  if (dom.countProcNaoCons) dom.countProcNaoCons.textContent = naoCons;

  const totalAlertas = critica + alerta;
  if (dom.badgeProcuracoesAlerta) {
    if (totalAlertas > 0) {
      dom.badgeProcuracoesAlerta.textContent = `${totalAlertas} alerta${totalAlertas > 1 ? "s" : ""}`;
      dom.badgeProcuracoesAlerta.style.display = "inline-block";
    } else {
      dom.badgeProcuracoesAlerta.style.display = "none";
    }
  }
}

function renderProcuracoesTable() {
  if (!dom.tableProcBody) return;
  const showInactive = dom.chkShowInactive ? dom.chkShowInactive.checked : false;
  const q = state.searchProcQuery;
  const filter = state.currentProcFilter;

  const filtered = state.dominioOverview.filter((item) => {
    if (!showInactive && item.empresa.ativo === false) return false;
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const proc = state.procuracoesMap.get(cnpj);

    if (filter === "CRITICA_EXPIRADA" && (!proc || (proc.situacao !== "EXPIRADA" && proc.situacao !== "CRITICA"))) return false;
    if (filter === "ALERTA" && (!proc || proc.situacao !== "ALERTA")) return false;
    if (filter === "VIGENTE" && (!proc || proc.situacao !== "VIGENTE")) return false;
    if (filter === "NAO_CONSULTADA" && proc) return false;

    if (q) {
      const matchCod = item.empresa.codiEmp.toLowerCase().includes(q);
      const matchRazao = item.empresa.razaoSocial.toLowerCase().includes(q);
      const matchCnpj = item.empresa.cnpj.toLowerCase().includes(q);
      if (!matchCod && !matchRazao && !matchCnpj) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    dom.tableProcBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Nenhuma procuração encontrada com os filtros selecionados.</td>
      </tr>
    `;
    return;
  }

  let html = "";
  for (const item of filtered) {
    const cnpj = String(item.empresa.cnpj || "").replace(/\D/g, "");
    const proc = state.procuracoesMap.get(cnpj);
    const isAtiva = item.empresa.ativo !== false;

    let badgeClass = "badge-proc-nao-consultada";
    let badgeText = "Não Consultada";
    let diasText = "-";
    let expText = "-";
    let totalSistemas = 0;

    if (proc) {
      if (proc.situacao === "EXPIRADA") {
        badgeClass = "badge-proc-expirada";
        badgeText = "Expirada";
      } else if (proc.situacao === "CRITICA") {
        badgeClass = "badge-proc-critica";
        badgeText = "Crítica (≤ 30d)";
      } else if (proc.situacao === "ALERTA") {
        badgeClass = "badge-proc-alerta";
        badgeText = "Atenção (31-60d)";
      } else {
        badgeClass = "badge-proc-vigente";
        badgeText = "Vigente";
      }

      diasText = proc.dias_restantes !== null && proc.dias_restantes !== undefined ? `${proc.dias_restantes} dias` : "-";
      expText = proc.data_expiracao || "-";
      totalSistemas = proc.total_sistemas || (proc.sistemas ? proc.sistemas.length : 0);
    }

    const inactiveBadgeHtml = !isAtiva
      ? '<span class="status-badge badge-neutral" style="margin-left: 0.5rem; font-size: 0.68rem;">Inativa</span>'
      : "";

    html += `
      <tr>
        <td class="mono font-bold">${item.empresa.codiEmp}</td>
        <td class="mono">${maskCnpj(item.empresa.cnpj)}</td>
        <td>
          <strong>${item.empresa.razaoSocial}</strong>${inactiveBadgeHtml}
        </td>
        <td class="mono">${expText}</td>
        <td class="mono"><strong>${diasText}</strong></td>
        <td><span class="${badgeClass}">${badgeText}</span></td>
        <td>
          ${
            proc && totalSistemas > 0
              ? `<button class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="abrirModalSistemas('${cnpj}')">
                  ${totalSistemas} sistemas
                 </button>`
              : '<span class="text-muted">-</span>'
          }
        </td>
        <td class="mono" style="font-size: 0.8rem; color: #94A3B8;">
          ${proc ? formatDateTime(proc.data_consulta) : "-"}
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="consultarProcuracao('${cnpj}', true)">
              ${proc ? "Atualizar" : "Consultar"}
            </button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.55rem; font-size: 0.75rem;" title="Ver Dossiê Fiscal Obsidian" onclick="abrirModalObsidian('${cnpj}')">
              Dossiê Obsidian
            </button>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.55rem; font-size: 0.75rem;" title="Kit Mensal de Guias" onclick="abrirModalKitMensal('${cnpj}')">
              Kit Mensal
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  dom.tableProcBody.innerHTML = html;
}

window.consultarProcuracao = async function (cnpj, forceRefresh = false) {
  showLoading(`Consultando procuração eletrônica RFB do CNPJ ${maskCnpj(cnpj)}...`);
  try {
    const res = await fetch("/api/procuracoes/consultar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, forceRefresh }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    state.procuracoesMap.set(cnpj, data);
    updateProcKpis();
    renderProcuracoesTable();
  } catch (err) {
    alert("Erro ao consultar procuração: " + err.message);
  } finally {
    hideLoading();
  }
};

window.abrirModalSistemas = function (cnpj) {
  const proc = state.procuracoesMap.get(cnpj);
  const emp = state.dominioOverview.find((i) => String(i.empresa.cnpj || "").replace(/\D/g, "") === cnpj);
  dom.procModalTitle.textContent = `Procuração RFB — ${emp ? emp.empresa.razaoSocial : maskCnpj(cnpj)}`;

  let html = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="background: #0F172A; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-medium);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="color: #94A3B8; font-size: 0.85rem;">Status Geral:</span>
          <strong>${proc?.situacao || "Vigente"}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="color: #94A3B8; font-size: 0.85rem;">Vencimento RFB:</span>
          <strong>${proc?.data_expiracao || "-"}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94A3B8; font-size: 0.85rem;">Dias Restantes:</span>
          <strong style="color: #38BDF8;">${proc?.dias_restantes ?? "-"} dias</strong>
        </div>
      </div>
      <div>
        <h4 style="font-size: 0.9rem; color: #F8FAFC; margin-bottom: 0.5rem;">Sistemas e Serviços com Acesso Delegado:</h4>
        <div class="sistemas-tags-container">
  `;

  if (proc && proc.sistemas && proc.sistemas.length > 0) {
    proc.sistemas.forEach((s) => {
      html += `<span class="sistema-tag">  ${s}</span>`;
    });
  } else {
    html += `<span class="text-muted">Nenhum sistema específico listado.</span>`;
  }

  html += `
        </div>
      </div>
    </div>
  `;

  dom.procModalBody.innerHTML = html;
  dom.procuracaoModal.classList.add("active");
};

function closeProcModal() {
  dom.procuracaoModal.classList.remove("active");
}

/* ========================================================================= */
/* MÓDULO: WORKER NOTURNO & VARREDURA AUTOMÁTICA EM SEGUNDO PLANO           */
/* ========================================================================= */

function abrirModalWorker() {
  dom.workerModal.classList.add("active");
  checkWorkerStatus();
}

function closeWorkerModal() {
  dom.workerModal.classList.remove("active");
}

async function triggerWorker(limit) {
  try {
    const res = await fetch("/api/worker/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    pollWorkerStatus();
  } catch (err) {
    alert("Erro ao disparar varredura: " + err.message);
  }
}

async function checkWorkerStatus() {
  try {
    const res = await fetch("/api/worker/status");
    const data = await res.json();
    updateWorkerUI(data.current, data.latest);

    if (data.current?.isRunning) {
      pollWorkerStatus();
    }
  } catch (err) {
    console.warn("Falha ao checar status do worker:", err);
  }
}

function pollWorkerStatus() {
  if (state.workerPollInterval) clearInterval(state.workerPollInterval);

  state.workerPollInterval = setInterval(async () => {
    try {
      const res = await fetch("/api/worker/status");
      const data = await res.json();
      const curr = data.current;
      updateWorkerUI(curr, data.latest);

      if (!curr?.isRunning) {
        clearInterval(state.workerPollInterval);
        state.workerPollInterval = null;
        loadCaixaPostalData();
        loadProcuracoesData();
        loadSitfisData();
      }
    } catch {
      clearInterval(state.workerPollInterval);
      state.workerPollInterval = null;
    }
  }, 1000);
}

function updateWorkerUI(curr, latest) {
  if (curr?.isRunning) {
    const pct = curr.totalEmpresas > 0 ? Math.round((curr.processadas / curr.totalEmpresas) * 100) : 0;
    if (dom.workerStatusText) dom.workerStatusText.textContent = `Varrendo (${pct}%)...`;
    if (dom.workerStatusLabel) dom.workerStatusLabel.textContent = `Em execução: ${curr.processadas} de ${curr.totalEmpresas} empresas...`;
    if (dom.workerProgressPercent) dom.workerProgressPercent.textContent = `${pct}%`;
    if (dom.workerProgressBar) dom.workerProgressBar.style.width = `${pct}%`;

    if (dom.workerNovasMsg) dom.workerNovasMsg.textContent = curr.novasMensagensEncontradas || 0;
    if (dom.workerProcCriticas) dom.workerProcCriticas.textContent = curr.procuracoesVencendo || 0;
    if (dom.workerPendenciasCnd) dom.workerPendenciasCnd.textContent = curr.pendenciasEncontradas || 0;
  } else {
    if (dom.workerStatusText) dom.workerStatusText.textContent = "Varredura Noturna";
    if (dom.workerProgressBar) dom.workerProgressBar.style.width = "100%";
    if (dom.workerProgressPercent) dom.workerProgressPercent.textContent = "Concluído";
    if (latest) {
      if (dom.workerStatusLabel) {
        dom.workerStatusLabel.textContent = `Última execução: ${formatDateTime(latest.data_execucao)} (${latest.empresas_processadas} empresas)`;
      }
      if (dom.workerNovasMsg) dom.workerNovasMsg.textContent = latest.novas_mensagens_encontradas || 0;
      if (dom.workerProcCriticas) dom.workerProcCriticas.textContent = latest.procuracoes_vencendo || 0;
      if (dom.workerPendenciasCnd) dom.workerPendenciasCnd.textContent = latest.pendencias_encontradas || 0;
    } else {
      if (dom.workerStatusLabel) dom.workerStatusLabel.textContent = "Status: Ocioso";
    }
  }
}

/* ========================================================================= */
/* MÓDULO: ATENDIMENTO EXPRESSO MEI                                          */
/* ========================================================================= */

async function emitirCcmei() {
  const cnpj = (dom.meiCnpjInput?.value || "").replace(/\D/g, "");
  if (!cnpj) {
    alert("Por favor, informe o CNPJ do Microempreendedor Individual (MEI).");
    return;
  }

  showLoading(`Emitindo Certificado da Condição de MEI (CCMEI)...`);
  try {
    const res = await fetch("/api/mei/ccmei", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.pdfBase64) throw new Error("A API não retornou o PDF do CCMEI.");

    downloadBase64Pdf(data.pdfBase64, `ccmei_${cnpj}.pdf`);
  } catch (err) {
    alert("Erro ao emitir CCMEI: " + err.message);
  } finally {
    hideLoading();
  }
}

async function gerarDasMei() {
  const cnpj = (dom.meiCnpjInput?.value || "").replace(/\D/g, "");
  const pa = (dom.meiPeriodoInput?.value || "").replace(/\D/g, "");
  if (!cnpj) {
    alert("Por favor, informe o CNPJ do MEI.");
    return;
  }
  if (!pa || pa.length !== 6) {
    alert("Por favor, informe o Período de Apuração no formato AAAAMM (ex: 202608).");
    return;
  }

  showLoading(`Gerando DAS-MEI para o período ${formatPa(pa)}...`);
  try {
    const res = await fetch("/api/mei/das", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, periodoApuracao: pa }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.pdfBase64) throw new Error("A API não retornou o PDF do DAS-MEI.");

    downloadBase64Pdf(data.pdfBase64, `das_mei_${cnpj}_${pa}.pdf`);
  } catch (err) {
    alert("Erro ao gerar DAS-MEI: " + err.message);
  } finally {
    hideLoading();
  }
}

async function consultarDividaAtivaMei() {
  const cnpj = (dom.meiCnpjInput?.value || "").replace(/\D/g, "");
  if (!cnpj) {
    alert("Por favor, informe o CNPJ do MEI.");
    return;
  }

  showLoading(`Consultando Dívida Ativa da União na PGFN...`);
  try {
    const res = await fetch("/api/mei/divida-ativa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    let html = "";
    if (data.debitos && data.debitos.length > 0) {
      html += `
        <table class="sub-table" style="width: 100%; margin-top: 0.5rem;">
          <thead>
            <tr>
              <th>Período</th>
              <th>Tributo</th>
              <th>Valor (R$)</th>
              <th>Ente Federado</th>
              <th>Situação do Débito</th>
            </tr>
          </thead>
          <tbody>
      `;
      for (const d of data.debitos) {
        html += `
          <tr>
            <td class="mono">${formatPa(d.periodoApuracao)}</td>
            <td><strong>${d.tributo}</strong></td>
            <td class="mono font-bold text-danger">${formatCurrency(d.valor)}</td>
            <td>${d.enteFederado}</td>
            <td><span class="badge-proc-critica">${d.situacaoDebito}</span></td>
          </tr>
        `;
      }
      html += `</tbody></table>`;
    } else {
      html = `
        <div class="alert-box alert-success" style="margin-top: 0.5rem;">
          Regular: Nenhum débito inscrito em Dívida Ativa da União foi localizado para este MEI.
        </div>
      `;
    }

    if (dom.meiResultTitle) dom.meiResultTitle.textContent = `Dívida Ativa da União — MEI ${maskCnpj(cnpj)}`;
    if (dom.meiResultBody) dom.meiResultBody.innerHTML = html;
    if (dom.meiResultContainer) dom.meiResultContainer.style.display = "block";
  } catch (err) {
    alert("Erro ao consultar dívida ativa: " + err.message);
  } finally {
    hideLoading();
  }
}

/* ========================================================================= */
/* MÓDULO: CALCULADORA SICALC E EMISSÃO DE DARF AVULSO                      */
/* ========================================================================= */

async function emitirDarfSicalc() {
  const cnpj = (dom.sicalcCnpj?.value || "").replace(/\D/g, "");
  const codigoReceita = (dom.sicalcReceita?.value || "").trim();
  const dataPA = (dom.sicalcPA?.value || "").trim();
  const valorImposto = Number(dom.sicalcValor?.value || 0);
  const vencimento = dom.sicalcVencimento?.value || undefined;
  const dataConsolidacao = dom.sicalcConsolidacao?.value || undefined;

  if (!cnpj || !codigoReceita || !dataPA || valorImposto <= 0) {
    alert("Por favor, preencha CNPJ, Código da Receita, PA e Valor do Imposto.");
    return;
  }

  showLoading(`Calculando encargos legais e consolidando DARF oficial no SERPRO...`);
  try {
    const res = await fetch("/api/sicalc/gerar-darf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj,
        codigoReceita,
        dataPA,
        valorImposto,
        vencimento,
        dataConsolidacao,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const c = data.consolidado || {};
    const html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
        <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 6px;">
          <div style="font-size: 0.75rem; color: #94A3B8;">Valor Principal</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #F8FAFC;">${formatCurrency(data.valorPrincipal || valorImposto)}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 6px;">
          <div style="font-size: 0.75rem; color: #94A3B8;">Multa de Mora</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #FBBF24;">${formatCurrency(data.valorMulta || 0)}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 6px;">
          <div style="font-size: 0.75rem; color: #94A3B8;">Juros SELIC</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #FBBF24;">${formatCurrency(data.valorJuros || 0)}</div>
        </div>
        <div style="background: rgba(16,185,129,0.08); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(16,185,129,0.3);">
          <div style="font-size: 0.75rem; color: #34D399;">Total Consolidado</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #34D399;">${formatCurrency(data.valorTotal || valorImposto)}</div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.85rem; color: #94A3B8;">Nº do Documento Oficial: <strong>${data.numeroDocumento || "-"}</strong></span>
        ${
          data.pdfBase64
            ? `<button class="btn btn-success" style="padding: 0.5rem 1rem;" onclick="downloadBase64Pdf('${data.pdfBase64}', 'darf_sicalc_${codigoReceita}_${cnpj}.pdf')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Baixar DARF Oficial (PDF)
               </button>`
            : ""
        }
      </div>
    `;

    if (dom.sicalcResultBody) dom.sicalcResultBody.innerHTML = html;
    if (dom.sicalcResultContainer) dom.sicalcResultContainer.style.display = "block";
  } catch (err) {
    alert("Erro ao emitir DARF Sicalc: " + err.message);
  } finally {
    hideLoading();
  }
}

/* ========================================================================= */
/* MÓDULO: SINCRONIZAÇÃO COM OBSIDIAN & KIT MENSAL DE GUIAS                  */
/* ========================================================================= */

let currentObsidianMarkdown = "";
let currentObsidianFilename = "";

window.abrirModalObsidian = async function (cnpj) {
  showLoading("Compilando Dossiê Fiscal da empresa para o Obsidian...");
  try {
    const res = await fetch(`/api/obsidian/dossie/${cnpj}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    currentObsidianMarkdown = data.markdown;
    currentObsidianFilename = data.filename;

    if (dom.obsidianModalTitle) {
      dom.obsidianModalTitle.textContent = `Dossiê Fiscal — ${data.razaoSocial}`;
    }
    if (dom.obsidianPreviewPre) {
      dom.obsidianPreviewPre.textContent = data.markdown;
    }

    dom.obsidianModal.classList.add("active");
  } catch (err) {
    alert("Erro ao gerar Dossiê Obsidian: " + err.message);
  } finally {
    hideLoading();
  }
};

function copiarMarkdownObsidian() {
  if (!currentObsidianMarkdown) return;
  navigator.clipboard.writeText(currentObsidianMarkdown).then(() => {
    alert("Markdown copiado com sucesso! Você pode colar diretamente em uma nota do Obsidian.");
  });
}

function baixarDossieMarkdown() {
  if (!currentObsidianMarkdown) return;
  const blob = new Blob([currentObsidianMarkdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = currentObsidianFilename || "Dossie-Fiscal.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function closeObsidianModal() {
  dom.obsidianModal.classList.remove("active");
}

window.abrirModalKitMensal = async function (cnpj) {
  const comp = state.competencia || "2026-08";
  showLoading(`Compilando Kit de Guias do mês para a competência ${comp}...`);
  try {
    const res = await fetch(`/api/empresas/${cnpj}/kit-mensal/${comp}`);
    const kit = await res.json();
    if (kit.error) throw new Error(kit.error);

    dom.kitModalTitle.textContent = `Kit Mensal de Guias — ${kit.razaoSocial} (${comp})`;

    let html = `
      <div style="margin-bottom: 1rem; background: #0F172A; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-medium);">
        <h4 style="font-size: 0.85rem; color: #94A3B8; text-transform: uppercase; margin-bottom: 0.5rem;">Diagnóstico do Mês</h4>
        <div style="display: flex; gap: 1.5rem; font-size: 0.85rem;">
          <span>Procuração: <strong>${kit.situacaoGeral.procuracao}</strong></span>
          <span>CND / Situação: <strong>${kit.situacaoGeral.sitfis}</strong></span>
          <span>Caixa Postal: <strong>${kit.situacaoGeral.novasMensagens ? "Novas Mensagens" : "Em dia"}</strong></span>
        </div>
      </div>
      <div>
        <h4 style="font-size: 0.95rem; color: #F8FAFC; margin-bottom: 0.75rem;">Guias e Documentos Disponíveis:</h4>
    `;

    for (const g of kit.guias) {
      html += `
        <div class="kit-guia-item">
          <div class="kit-guia-info">
            <span class="kit-guia-title">${g.tipo}</span>
            <span class="kit-guia-sub">${g.descricao}</span>
          </div>
          <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="gerarGuiaDoKit('${g.gerarUrl}', ${JSON.stringify(g.payload).replace(/"/g, '&quot;')})">
            Emitir PDF
          </button>
        </div>
      `;
    }

    html += `</div>`;
    dom.kitModalBody.innerHTML = html;
    dom.kitMensalModal.classList.add("active");
  } catch (err) {
    alert("Erro ao compilar Kit Mensal: " + err.message);
  } finally {
    hideLoading();
  }
};

window.gerarGuiaDoKit = async function (url, payload) {
  showLoading("Emitindo guia de arrecadação...");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.pdfBase64) throw new Error("A API não retornou o PDF da guia.");
    downloadBase64Pdf(data.pdfBase64, `guia_${payload.cnpj || "doc"}.pdf`);
  } catch (err) {
    alert("Erro ao emitir guia: " + err.message);
  } finally {
    hideLoading();
  }
};

function closeKitModal() {
  dom.kitMensalModal.classList.remove("active");
}

/* ========================================================================= */
/* UTILITÁRIOS GERAIS                                                        */
/* ========================================================================= */

function showLoading(msg) {
  if (dom.loadingText) dom.loadingText.textContent = msg || "Carregando...";
  if (dom.loadingOverlay) dom.loadingOverlay.classList.add("active");
}

function hideLoading() {
  if (dom.loadingOverlay) dom.loadingOverlay.classList.remove("active");
}
