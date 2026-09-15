/**
 * Lógica da aplicação frontend para conciliação fiscal REINF × DCTFWeb × Domínio
 * e Módulos Integrados: Situação Fiscal (CND), Caixa Postal / DTE e Pagamentos Arrecadados
 */

// Estado global da aplicação
const state = {
  activeTab: "dctfweb",
  competencia: "2026-08",
  dominioOverview: [],
  reconciledMap: new Map(), // codiEmp -> ReconciliationResult
  currentStatusFilter: "COM_MOVIMENTO",
  searchQuery: "",
  summary: null,
  expandedRows: new Set(),

  // Estados dos novos módulos
  sitfisMap: new Map(), // cnpj -> SitfisResult
  caixaMap: new Map(), // cnpj -> CaixaPostalResult
  pagamentosMap: new Map(), // cnpj -> PagamentosResult
  currentSitfisFilter: "ALL",
  currentCaixaFilter: "ALL",
  currentPagFilter: "ALL",
  searchSitfisQuery: "",
  searchCaixaQuery: "",
  searchPagQuery: "",
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

  // Novos Modais
  caixaPostalModal: document.getElementById("caixaPostalModal"),
  btnCloseCaixaModal: document.getElementById("btnCloseCaixaModal"),
  btnCloseCaixaBtn: document.getElementById("btnCloseCaixaBtn"),
  caixaModalTitle: document.getElementById("caixaModalTitle"),
  caixaModalBody: document.getElementById("caixaModalBody"),

  pagamentosModal: document.getElementById("pagamentosModal"),
  btnClosePagamentosModal: document.getElementById("btnClosePagamentosModal"),
  btnClosePagamentosBtn: document.getElementById("btnClosePagamentosBtn"),
  pagamentosModalTitle: document.getElementById("pagamentosModalTitle"),
  pagamentosModalBody: document.getElementById("pagamentosModalBody"),

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

// Inicialização
window.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadStatus();
  await loadCompetencias();
  await loadDominioData();
  await loadSitfisData();
  await loadCaixaPostalData();
  await loadPagamentosData();
});

// Configuração de Event Listeners
function setupEventListeners() {
  // Tabs Navigation
  const tabButtons = [
    { id: "tabBtnDctfweb", tab: "dctfweb" },
    { id: "tabBtnSitfis", tab: "sitfis" },
    { id: "tabBtnCaixapostal", tab: "caixapostal" },
    { id: "tabBtnPagamentos", tab: "pagamentos" },
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
    window.location.href = "/api/export/latest";
  });

  dom.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderTable();
  });

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
}

function switchTab(tabId) {
  state.activeTab = tabId;
  const tabs = ["dctfweb", "sitfis", "caixapostal", "pagamentos"];
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
              lanStatusText.textContent = "✓ Link copiado!";
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

async function loadDominioData() {
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
      <tr class="${rowClasses}" onclick="toggleRow('${item.empresa.codiEmp}')">
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
              <span title="Data e hora da consulta à API SERPRO">🕒 ${formatDateTime(combined.dataUltimaConsulta)}</span>
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
          <button class="${btnActionClass}" style="padding: 0.35rem 0.7rem; font-size: 0.75rem;"${btnActionTitle} onclick="event.stopPropagation(); reprocessSingle('${item.empresa.codiEmp}', ${combined.isConsulted})">
            ${combined.isConsulted ? "Reconsultar" : "Consultar DCTFWeb"}
          </button>
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
          <strong style="color: #F8FAFC; margin-left: 0.35rem;">🕒 ${formatDateTime(combined.dataUltimaConsulta)}</strong>
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
          <strong style="color: #60A5FA; margin-left: 0.35rem;">${combined.reciboDctfweb || "Não informado"}</strong>
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
      msg = `<strong>Pendências no Domínio:</strong><br>${combined.pendencias.join("<br>")}`;
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
        badgeHtml = '<span class="status-badge badge-sitfis-regular">✓ CND Negativa (Regular)</span>';
        diagText = "Regularidade fiscal plena perante RFB e PGFN";
      } else if (sit.situacao === "PROCESSANDO") {
        badgeHtml = '<span class="status-badge badge-sitfis-processando">⏳ Processando</span>';
        diagText = "Protocolo gerado, relatório em compilação";
      } else {
        badgeHtml = '<span class="status-badge badge-sitfis-pendencia">✕ Pendências Identificadas</span>';
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
            ↻ Atualizar
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
              ? '<span class="badge-cache">Cache Local</span>'
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
        statusHtml = '<span class="status-badge badge-caixa-novas">📬 Novas Mensagens</span>';
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
          <span class="msg-origem">🏛️ ${m.descricaoOrigem || "Receita Federal"}</span>
          <span>📅 Data: ${m.dataEnvio || "-"} ${m.horaEnvio || ""}</span>
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
/* UTILITÁRIOS GERAIS                                                        */
/* ========================================================================= */

function showLoading(msg) {
  if (dom.loadingText) dom.loadingText.textContent = msg || "Carregando...";
  if (dom.loadingOverlay) dom.loadingOverlay.classList.add("active");
}

function hideLoading() {
  if (dom.loadingOverlay) dom.loadingOverlay.classList.remove("active");
}
