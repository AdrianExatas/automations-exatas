(function () {
  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function onlyDigits(str) {
    return (str || "").replace(/\D/g, "");
  }

  function showMsg(elId, ok, mensagem) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.hidden = false;
    el.classList.remove("success", "error");
    el.classList.add(ok ? "success" : "error");
    el.innerHTML =
      '<span class="titulo">' +
      (ok ? "Sucesso" : "Erro") +
      '</span><p class="mensagem">' +
      escapeHtml(mensagem) +
      "</p>";
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle("loading", loading);
  }

  function parseRespostaComoJson(res, texto) {
    if (texto.trim().startsWith("<")) {
      return {
        ok: false,
        mensagem:
          "O servidor retornou HTML em vez de JSON. Use o servidor do projeto: npm run build && npm run server.",
      };
    }
    try {
      return JSON.parse(texto);
    } catch (e) {
      return { ok: false, mensagem: "Resposta inválida: " + (texto.slice(0, 100) || res.status) };
    }
  }

  // Lista de UFs (estados) para o seletor na aba Atualizar
  var LISTA_UF = [
    { nome: "Acre", sigla: "AC" },
    { nome: "Alagoas", sigla: "AL" },
    { nome: "Amapá", sigla: "AP" },
    { nome: "Amazonas", sigla: "AM" },
    { nome: "Bahia", sigla: "BA" },
    { nome: "Ceará", sigla: "CE" },
    { nome: "Distrito Federal", sigla: "DF" },
    { nome: "Espírito Santo", sigla: "ES" },
    { nome: "Goiás", sigla: "GO" },
    { nome: "Maranhão", sigla: "MA" },
    { nome: "Mato Grosso", sigla: "MT" },
    { nome: "Mato Grosso do Sul", sigla: "MS" },
    { nome: "Minas Gerais", sigla: "MG" },
    { nome: "Pará", sigla: "PA" },
    { nome: "Paraíba", sigla: "PB" },
    { nome: "Paraná", sigla: "PR" },
    { nome: "Pernambuco", sigla: "PE" },
    { nome: "Piauí", sigla: "PI" },
    { nome: "Rio de Janeiro", sigla: "RJ" },
    { nome: "Rio Grande do Norte", sigla: "RN" },
    { nome: "Rio Grande do Sul", sigla: "RS" },
    { nome: "Rondônia", sigla: "RO" },
    { nome: "Roraima", sigla: "RR" },
    { nome: "Santa Catarina", sigla: "SC" },
    { nome: "São Paulo", sigla: "SP" },
    { nome: "Sergipe", sigla: "SE" },
    { nome: "Tocantins", sigla: "TO" },
  ];

  (function preencherSelectUf() {
    function preencher(select) {
      if (!select) return;
      LISTA_UF.forEach(function (u) {
        var opt = document.createElement("option");
        opt.value = u.sigla;
        opt.textContent = u.nome + " (" + u.sigla + ")";
        select.appendChild(opt);
      });
    }
    preencher(document.getElementById("editar-uf"));
    preencher(document.getElementById("reg-uf"));
  })();

  // --- Preencher UNECONT e ONVIO com valores do .env (API) ---
  (function carregarDefaultsFormularios() {
    fetch("/api/defaults/unecont")
      .then(function (r) { return r.text(); })
      .then(function (texto) {
        try {
          var data = JSON.parse(texto);
          if (data.success && data.data) {
            var d = data.data;
            var elEmail = document.getElementById("unecont-email");
            var elSenha = document.getElementById("unecont-senha");
            if (elEmail && d.email) elEmail.value = d.email;
            if (elSenha && d.senha) elSenha.value = d.senha;
          }
        } catch (e) {}
      })
      .catch(function () {});

    fetch("/api/defaults/onvio")
      .then(function (r) { return r.text(); })
      .then(function (texto) {
        try {
          var data = JSON.parse(texto);
          if (data.success && data.data) {
            var d = data.data;
            var elEmail = document.getElementById("onvio-email");
            var elSenha = document.getElementById("onvio-senha");
            var elCnpj = document.getElementById("onvio-cnpj");
            if (elEmail && d.email) elEmail.value = d.email;
            if (elSenha && d.senha) elSenha.value = d.senha;
            if (elCnpj && d.cnpj) elCnpj.value = d.cnpj;
          }
        } catch (e) {}
      })
      .catch(function () {});
  })();

  // Copia CNPJ, senha e arquivo do certificado da aba Atualizar ou Registrar para UNECONT (ao abrir aba UNECONT)
  function preencherUnecontComDadosSieg() {
    var cnpjAtualizar = onlyDigits((document.getElementById("editar-cnpj") && document.getElementById("editar-cnpj").value) || "");
    var senhaAtualizar = (document.getElementById("editar-senha") && document.getElementById("editar-senha").value.trim()) || "";
    var fileAtualizar = document.getElementById("editar-certificado") && document.getElementById("editar-certificado").files[0];
    var cnpjRegistrar = onlyDigits((document.getElementById("reg-cnpj") && document.getElementById("reg-cnpj").value) || "");
    var senhaRegistrar = (document.getElementById("reg-senha") && document.getElementById("reg-senha").value.trim()) || "";
    var fileRegistrar = document.getElementById("reg-certificado") && document.getElementById("reg-certificado").files[0];
    var elCnpj = document.getElementById("unecont-cnpj");
    var elSenhaCert = document.getElementById("unecont-senha-certificado");
    var elFile = document.getElementById("unecont-certificado");
    if (cnpjAtualizar.length === 14 && elCnpj) elCnpj.value = cnpjAtualizar;
    else if (cnpjRegistrar.length === 14 && elCnpj) elCnpj.value = cnpjRegistrar;
    if (senhaAtualizar && elSenhaCert) elSenhaCert.value = senhaAtualizar;
    else if (senhaRegistrar && elSenhaCert) elSenhaCert.value = senhaRegistrar;
    var file = fileAtualizar || fileRegistrar;
    if (file && elFile && typeof DataTransfer !== "undefined") {
      try {
        var dt = new DataTransfer();
        dt.items.add(file);
        elFile.files = dt.files;
      } catch (err) {}
    }
  }

  // Copia CNPJ, senha e arquivo do certificado da aba Atualizar ou Registrar para ONVIO (ao abrir aba ONVIO)
  function preencherOnvioComDadosSieg() {
    var cnpjAtualizar = onlyDigits((document.getElementById("editar-cnpj") && document.getElementById("editar-cnpj").value) || "");
    var senhaAtualizar = (document.getElementById("editar-senha") && document.getElementById("editar-senha").value.trim()) || "";
    var fileAtualizar = document.getElementById("editar-certificado") && document.getElementById("editar-certificado").files[0];
    var cnpjRegistrar = onlyDigits((document.getElementById("reg-cnpj") && document.getElementById("reg-cnpj").value) || "");
    var senhaRegistrar = (document.getElementById("reg-senha") && document.getElementById("reg-senha").value.trim()) || "";
    var fileRegistrar = document.getElementById("reg-certificado") && document.getElementById("reg-certificado").files[0];
    var elCnpjOnvio = document.getElementById("onvio-cnpj");
    var elSenhaCertOnvio = document.getElementById("onvio-senha-certificado");
    var elFileOnvio = document.getElementById("onvio-certificado");
    if (cnpjAtualizar.length === 14 && elCnpjOnvio) elCnpjOnvio.value = cnpjAtualizar;
    else if (cnpjRegistrar.length === 14 && elCnpjOnvio) elCnpjOnvio.value = cnpjRegistrar;
    if (senhaAtualizar && elSenhaCertOnvio) elSenhaCertOnvio.value = senhaAtualizar;
    else if (senhaRegistrar && elSenhaCertOnvio) elSenhaCertOnvio.value = senhaRegistrar;
    var file = fileAtualizar || fileRegistrar;
    if (file && elFileOnvio && typeof DataTransfer !== "undefined") {
      try {
        var dt = new DataTransfer();
        dt.items.add(file);
        elFileOnvio.files = dt.files;
      } catch (e) {}
    }
  }

  // --- Abas (SIEG, UNECONT, ONVIO) ---
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      const name = this.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".panel").forEach(function (p) {
        p.classList.remove("active");
      });
      this.classList.add("active");
      this.setAttribute("aria-selected", "true");
      const panel = document.getElementById("panel-" + name);
      if (panel) panel.classList.add("active");
      if (name === "unecont") preencherUnecontComDadosSieg();
      if (name === "onvio") preencherOnvioComDadosSieg();
    });
  });

  // --- SIEG: sub-escolha Registrar / Atualizar ---
  function atualizarSubpanelSieg() {
    var acao = document.querySelector('input[name="sieg-acao"]:checked');
    var valor = acao ? acao.value : "registrar";
    document.getElementById("sieg-sub-registrar").hidden = valor !== "registrar";
    document.getElementById("sieg-sub-atualizar").hidden = valor !== "atualizar";
  }
  document.querySelectorAll('input[name="sieg-acao"]').forEach(function (radio) {
    radio.addEventListener("change", atualizarSubpanelSieg);
  });
  atualizarSubpanelSieg();

  // --- Botões "Usar dados do SIEG" ---
  var btnUnecontSieg = document.getElementById("btn-unecont-usar-sieg");
  if (btnUnecontSieg) btnUnecontSieg.addEventListener("click", preencherUnecontComDadosSieg);
  var btnOnvioSieg = document.getElementById("btn-onvio-usar-sieg");
  if (btnOnvioSieg) btnOnvioSieg.addEventListener("click", preencherOnvioComDadosSieg);

  // --- Registrar ---
  document.getElementById("form-registrar").addEventListener("submit", async function (e) {
    e.preventDefault();
    const file = document.getElementById("reg-certificado").files[0];
    const senha = document.getElementById("reg-senha").value.trim();
    const nome = (document.getElementById("reg-nome") && document.getElementById("reg-nome").value.trim()) || "";
    const cnpj = document.getElementById("reg-cnpj").value.trim();
    if (!file || !senha) {
      showMsg("registrar-resultado", false, "Arquivo e senha são obrigatórios.");
      return;
    }
    if (!nome) {
      showMsg("registrar-resultado", false, "Nome do certificado (razão social) é obrigatório.");
      return;
    }
    const btn = document.getElementById("btn-registrar");
    setLoading(btn, true);
    const formData = new FormData();
    formData.append("certificado", file);
    formData.append("senha", senha);
    formData.append("nome", nome);
    if (cnpj) formData.append("cnpj", cnpj);
    var regUf = (document.getElementById("reg-uf") && document.getElementById("reg-uf").value) || "";
    if (regUf) formData.append("uf", regUf);
    try {
      const res = await fetch("/api/certificado/registrar", { method: "POST", body: formData });
      const texto = await res.text();
      const data = parseRespostaComoJson(res, texto);
      var msg = data.message ?? data.mensagem;
      if (Array.isArray(msg)) msg = msg.length ? msg.join("; ") : "";
      if (Array.isArray(data.errors)) msg = data.errors.join("; ");
      showMsg("registrar-resultado", data.success === true, msg || (data.success ? "Registrado." : "Erro."));
    } catch (err) {
      showMsg("registrar-resultado", false, err.message || "Erro de conexão.");
    } finally {
      setLoading(btn, false);
    }
  });

  // --- Registrar: extrair CNPJ do certificado ---
  document.getElementById("btn-registrar-extrair-cnpj").addEventListener("click", async function () {
    var fileInput = document.getElementById("reg-certificado");
    var senhaInput = document.getElementById("reg-senha");
    var file = fileInput && fileInput.files[0];
    var senha = senhaInput && senhaInput.value.trim();
    var msgEl = document.getElementById("registrar-cnpj-msg");
    if (!file) {
      msgEl.textContent = "Selecione o arquivo do certificado (.pfx) primeiro.";
      msgEl.classList.remove("success");
      msgEl.classList.add("error");
      msgEl.hidden = false;
      return;
    }
    if (!senha) {
      msgEl.textContent = "Informe a senha do certificado.";
      msgEl.classList.remove("success");
      msgEl.classList.add("error");
      msgEl.hidden = false;
      return;
    }
    var btn = this;
    setLoading(btn, true);
    msgEl.hidden = true;
    try {
      var formData = new FormData();
      formData.append("certificado", file);
      formData.append("senha", senha);
      var res = await fetch("/api/certificado/extrair-cnpj", { method: "POST", body: formData });
      var texto = await res.text();
      var data = parseRespostaComoJson(res, texto);
      if (data.success && data.data && data.data.cnpj) {
        document.getElementById("reg-cnpj").value = data.data.cnpj;
        msgEl.textContent = "CNPJ extraído com sucesso.";
        msgEl.classList.remove("error");
        msgEl.classList.add("success");
        msgEl.hidden = false;
      } else {
        msgEl.textContent = data.error || data.mensagem || "Não foi possível extrair o CNPJ do certificado.";
        msgEl.classList.remove("success");
        msgEl.classList.add("error");
        msgEl.hidden = false;
      }
    } catch (err) {
      msgEl.textContent = err.message || "Erro de conexão.";
      msgEl.classList.remove("success");
      msgEl.classList.add("error");
      msgEl.hidden = false;
    } finally {
      setLoading(btn, false);
    }
  });

  // --- Atualizar: buscar ID por CNPJ ---
  let certificadosCache = null;

  function getCertificadoIdByCnpj(cnpjDigits) {
    if (!cnpjDigits || cnpjDigits.length !== 14) return null;
    const list = certificadosCache;
    if (!Array.isArray(list)) return null;
    return list.find(function (c) {
      const cnpj = (c.CnpjCpf || "").replace(/\D/g, "");
      return cnpj === cnpjDigits;
    }) || null;
  }

  function showIdEncontrado(cert) {
    const box = document.getElementById("editar-id-box");
    const erro = document.getElementById("editar-id-erro");
    const idInput = document.getElementById("editar-id");
    const btnEditar = document.getElementById("btn-editar");
    if (!cert) {
      box.hidden = true;
      erro.hidden = true;
      idInput.value = "";
      btnEditar.disabled = true;
      return;
    }
    document.getElementById("editar-id-nome").textContent = cert.Nome || "—";
    document.getElementById("editar-id-valor").textContent = "ID: " + (cert.Id || "—");
    idInput.value = cert.Id || "";
    box.hidden = false;
    erro.hidden = true;
    btnEditar.disabled = !cert.Id;
  }

  function showIdErro(mensagem) {
    const box = document.getElementById("editar-id-box");
    const erro = document.getElementById("editar-id-erro");
    const idInput = document.getElementById("editar-id");
    const btnEditar = document.getElementById("btn-editar");
    box.hidden = true;
    idInput.value = "";
    btnEditar.disabled = true;
    erro.textContent = mensagem;
    erro.hidden = false;
  }

  document.getElementById("btn-extrair-cnpj").addEventListener("click", async function () {
    const fileInput = document.getElementById("editar-certificado");
    const senhaInput = document.getElementById("editar-senha");
    const file = fileInput.files[0];
    const senha = senhaInput.value.trim();
    if (!file) {
      showIdErro("Selecione o arquivo do certificado (.pfx) primeiro.");
      return;
    }
    if (!senha) {
      showIdErro("Informe a senha do certificado.");
      return;
    }
    const btn = this;
    setLoading(btn, true);
    document.getElementById("editar-id-erro").hidden = true;
    try {
      // Usa a API do servidor para extrair CNPJ (lógica completa com detecção de CA)
      const formData = new FormData();
      formData.append("certificado", file);
      formData.append("senha", senha);
      const res = await fetch("/api/certificado/extrair-cnpj", { method: "POST", body: formData });
      const textoRes = await res.text();
      const dataRes = parseRespostaComoJson(res, textoRes);
      if (!dataRes.success || !dataRes.data || !dataRes.data.cnpj) {
        showIdErro(dataRes.error || dataRes.mensagem || "Não foi possível extrair o CNPJ do certificado.");
        return;
      }
      const cnpj = dataRes.data.cnpj;
      document.getElementById("editar-cnpj").value = cnpj;
      // Buscar certificado na SIEG pelo CNPJ (busca por CNPJ)
      const resListar = await fetch("/api/certificado/listar?cnpj=" + encodeURIComponent(cnpj));
      const textoListar = await resListar.text();
      const dataListar = parseRespostaComoJson(resListar, textoListar);
      if (!dataListar.success) {
        showIdErro(dataListar.message || dataListar.mensagem || "Erro ao buscar certificado.");
        return;
      }
      certificadosCache = dataListar.data || [];
      if (dataListar.data && dataListar.data.length > 0) {
        const cert = dataListar.data[0];
        const id = cert.Id || cert.id || cert.CertificadoId || cert.certificadoId;
        if (id) {
          // Passa o objeto com Id maiúsculo para showIdEncontrado
          showIdEncontrado({ Id: id, Nome: cert.Nome || cert.nome || "—" });
        } else {
          showIdErro("Certificado encontrado mas sem ID. Dados: " + JSON.stringify(cert).slice(0, 200));
        }
      } else {
        showIdErro("CNPJ extraído: " + cnpj + ". Nenhum certificado na SIEG com esse CNPJ (buscou em todas as páginas).");
      }
    } catch (err) {
      showIdErro(err.message || "Não foi possível ler o certificado.");
    } finally {
      setLoading(btn, false);
    }
  });

  document.getElementById("btn-buscar-id").addEventListener("click", async function () {
    const cnpjInput = document.getElementById("editar-cnpj").value.trim();
    const cnpjDigits = onlyDigits(cnpjInput);
    if (cnpjDigits.length !== 14) {
      showIdErro("Informe um CNPJ válido (14 dígitos).");
      return;
    }
    const btn = this;
    setLoading(btn, true);
    document.getElementById("editar-id-erro").hidden = true;
    try {
      // Busca pelo CNPJ em todas as páginas
      const res = await fetch("/api/certificado/listar?cnpj=" + encodeURIComponent(cnpjDigits));
      const texto = await res.text();
      const data = parseRespostaComoJson(res, texto);
      if (!data.success) {
        showIdErro(data.message || data.mensagem || "Erro ao buscar certificado.");
        return;
      }
      certificadosCache = data.data || [];
      if (data.data && data.data.length > 0) {
        const cert = data.data[0];
        const id = cert.Id || cert.id || cert.CertificadoId || cert.certificadoId;
        if (id) {
          // Passa o objeto com Id maiúsculo para showIdEncontrado
          showIdEncontrado({ Id: id, Nome: cert.Nome || cert.nome || "—" });
        } else {
          showIdErro("Certificado encontrado mas sem ID. Dados: " + JSON.stringify(cert).slice(0, 200));
        }
      } else {
        showIdErro("Nenhum certificado encontrado na SIEG para este CNPJ (buscou em todas as páginas).");
      }
    } catch (err) {
      showIdErro(err.message || "Erro de conexão.");
    } finally {
      setLoading(btn, false);
    }
  });

  // Ao selecionar arquivo .pfx, extrair CNPJ do nome (ex.: RAZAO_27939154000108.pfx)
  document.getElementById("editar-certificado").addEventListener("change", function () {
    const file = this.files[0];
    if (!file || !file.name) return;
    const match = file.name.match(/_(\d{14})\.(pfx|p12)$/i) || file.name.match(/(\d{14})\.(pfx|p12)$/i);
    if (match) {
      document.getElementById("editar-cnpj").value = match[1];
    }
  });

  document.getElementById("reg-certificado").addEventListener("change", function () {
    var file = this.files[0];
    if (!file || !file.name) return;
    var nomeEl = document.getElementById("reg-nome");
    var cnpjEl = document.getElementById("reg-cnpj");
    var matchUnderscore = file.name.match(/^(.+)_(\d{14})\.(pfx|p12)$/i);
    var matchOnlyDigits = file.name.match(/_(\d{14})\.(pfx|p12)$/i) || file.name.match(/(\d{14})\.(pfx|p12)$/i);
    if (matchUnderscore && nomeEl && !nomeEl.value.trim()) {
      nomeEl.value = matchUnderscore[1].trim().replace(/\s+/g, " ");
    }
    if (cnpjEl) {
      if (matchUnderscore) cnpjEl.value = matchUnderscore[2];
      else if (matchOnlyDigits) cnpjEl.value = matchOnlyDigits[1];
    }
  });

  // --- UNECONT: executar automação ---
  document.getElementById("form-unecont").addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = document.getElementById("unecont-email").value.trim();
    var senha = document.getElementById("unecont-senha").value.trim();
    var cnpj = onlyDigits((document.getElementById("unecont-cnpj") && document.getElementById("unecont-cnpj").value) || "");
    var fileInput = document.getElementById("unecont-certificado");
    var file = fileInput && fileInput.files && fileInput.files[0];
    var senhaCertificado = (document.getElementById("unecont-senha-certificado") && document.getElementById("unecont-senha-certificado").value.trim()) || "";
    if (!email || !senha) {
      showMsg("unecont-resultado", false, "E-mail e senha são obrigatórios.");
      return;
    }
    var btn = document.getElementById("btn-unecont");
    setLoading(btn, true);
    document.getElementById("unecont-resultado").hidden = true;
    try {
      var res;
      if (cnpj.length === 14 && file && senhaCertificado) {
        var formData = new FormData();
        formData.append("email", email);
        formData.append("senha", senha);
        formData.append("cnpj", cnpj);
        formData.append("certificado", file);
        formData.append("senhaCertificado", senhaCertificado);
        res = await fetch("/api/unecont/executar", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/unecont/executar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, senha: senha }),
        });
      }
      var texto = await res.text();
      var data = parseRespostaComoJson(res, texto);
      showMsg("unecont-resultado", data.success === true, data.message || data.mensagem || data.error || (data.success ? "Automação executada." : "Erro na automação."));
    } catch (err) {
      showMsg("unecont-resultado", false, err.message || "Erro de conexão.");
    } finally {
      setLoading(btn, false);
    }
  });

  // --- ONVIO: executar automação (NFe Import Receita Federal) ---
  document.getElementById("form-onvio").addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = document.getElementById("onvio-email").value.trim();
    var senha = document.getElementById("onvio-senha").value.trim();
    var cnpj = onlyDigits((document.getElementById("onvio-cnpj") && document.getElementById("onvio-cnpj").value) || "");
    var fileInput = document.getElementById("onvio-certificado");
    var file = fileInput && fileInput.files && fileInput.files[0];
    var senhaCertificado = (document.getElementById("onvio-senha-certificado") && document.getElementById("onvio-senha-certificado").value.trim()) || "";
    if (!email || !senha) {
      showMsg("onvio-resultado", false, "E-mail e senha ONVIO são obrigatórios.");
      return;
    }
    if (cnpj.length !== 14) {
      showMsg("onvio-resultado", false, "CNPJ deve ter 14 dígitos.");
      return;
    }
    if (!file) {
      showMsg("onvio-resultado", false, "Selecione o arquivo do certificado (.pfx).");
      return;
    }
    if (!senhaCertificado) {
      showMsg("onvio-resultado", false, "Informe a senha do certificado (.pfx).");
      return;
    }
    var btn = document.getElementById("btn-onvio");
    setLoading(btn, true);
    document.getElementById("onvio-resultado").hidden = true;
    try {
      var formData = new FormData();
      formData.append("email", email);
      formData.append("senha", senha);
      formData.append("cnpj", cnpj);
      formData.append("certificado", file);
      formData.append("senhaCertificado", senhaCertificado);
      var res = await fetch("/api/onvio/executar", { method: "POST", body: formData });
      var texto = await res.text();
      var data = parseRespostaComoJson(res, texto);
      showMsg("onvio-resultado", data.success === true, data.message || data.mensagem || data.error || (data.success ? "Automação executada." : "Erro na automação."));
    } catch (err) {
      showMsg("onvio-resultado", false, err.message || "Erro de conexão.");
    } finally {
      setLoading(btn, false);
    }
  });

  // --- Executar todas as automações (UNECONT + ONVIO em paralelo) ---
  document.getElementById("btn-executar-todas").addEventListener("click", async function () {
    // Preenche UNECONT e ONVIO com dados do SIEG antes de ler os valores (evita precisar abrir as abas)
    preencherUnecontComDadosSieg();
    preencherOnvioComDadosSieg();
    var emailUnecont = document.getElementById("unecont-email").value.trim();
    var senhaUnecont = document.getElementById("unecont-senha").value.trim();
    var cnpjUnecont = onlyDigits((document.getElementById("unecont-cnpj") && document.getElementById("unecont-cnpj").value) || "");
    var fileUnecont = document.getElementById("unecont-certificado") && document.getElementById("unecont-certificado").files[0];
    var senhaCertUnecont = (document.getElementById("unecont-senha-certificado") && document.getElementById("unecont-senha-certificado").value.trim()) || "";
    var emailOnvio = document.getElementById("onvio-email").value.trim();
    var senhaOnvio = document.getElementById("onvio-senha").value.trim();
    var cnpjOnvio = onlyDigits((document.getElementById("onvio-cnpj") && document.getElementById("onvio-cnpj").value) || "");
    var fileOnvio = document.getElementById("onvio-certificado") && document.getElementById("onvio-certificado").files && document.getElementById("onvio-certificado").files[0];
    var senhaCertOnvio = (document.getElementById("onvio-senha-certificado") && document.getElementById("onvio-senha-certificado").value.trim()) || "";
    if (!emailUnecont || !senhaUnecont) {
      showMsg("executar-todas-resultado", false, "Preencha e-mail e senha na aba UNECONT.");
      document.getElementById("executar-todas-resultado").hidden = false;
      document.getElementById("executar-todas-resultado").className = "executar-todas-feedback error";
      return;
    }
    if (!emailOnvio || !senhaOnvio || cnpjOnvio.length !== 14 || !fileOnvio || !senhaCertOnvio) {
      showMsg("executar-todas-resultado", false, "Preencha todos os campos obrigatórios na aba ONVIO (e-mail, senha, CNPJ 14 dígitos, certificado e senha).");
      document.getElementById("executar-todas-resultado").hidden = false;
      document.getElementById("executar-todas-resultado").className = "executar-todas-feedback error";
      return;
    }
    var btn = document.getElementById("btn-executar-todas");
    setLoading(btn, true);
    var box = document.getElementById("executar-todas-resultado");
    box.hidden = false;
    box.className = "executar-todas-feedback";
    box.innerHTML = "<p>UNECONT: executando…</p><p>ONVIO: executando…</p>";
    var bodyUnecont = cnpjUnecont.length === 14 && fileUnecont && senhaCertUnecont
      ? (function () { var fd = new FormData(); fd.append("email", emailUnecont); fd.append("senha", senhaUnecont); fd.append("cnpj", cnpjUnecont); fd.append("certificado", fileUnecont); fd.append("senhaCertificado", senhaCertUnecont); return fd; })()
      : JSON.stringify({ email: emailUnecont, senha: senhaUnecont });
    var optsUnecont = { method: "POST" };
    if (typeof bodyUnecont === "string") { optsUnecont.headers = { "Content-Type": "application/json" }; optsUnecont.body = bodyUnecont; } else { optsUnecont.body = bodyUnecont; }
    var formOnvio = new FormData();
    formOnvio.append("email", emailOnvio);
    formOnvio.append("senha", senhaOnvio);
    formOnvio.append("cnpj", cnpjOnvio);
    formOnvio.append("certificado", fileOnvio);
    formOnvio.append("senhaCertificado", senhaCertOnvio);
    try {
      var resUnecont = await fetch("/api/unecont/executar", optsUnecont);
      var resOnvio = await fetch("/api/onvio/executar", { method: "POST", body: formOnvio });
      var textoUnecont = await resUnecont.text();
      var textoOnvio = await resOnvio.text();
      var dataUnecont = parseRespostaComoJson(resUnecont, textoUnecont);
      var dataOnvio = parseRespostaComoJson(resOnvio, textoOnvio);
      var msgUnecont = dataUnecont.success ? "UNECONT: sucesso." : ("UNECONT: " + (dataUnecont.message || dataUnecont.mensagem || dataUnecont.error || "erro"));
      var msgOnvio = dataOnvio.success ? "ONVIO: sucesso." : ("ONVIO: " + (dataOnvio.message || dataOnvio.mensagem || dataOnvio.error || "erro"));
      box.innerHTML = "<p class=\"" + (dataUnecont.success ? "success" : "error") + "\">" + escapeHtml(msgUnecont) + "</p><p class=\"" + (dataOnvio.success ? "success" : "error") + "\">" + escapeHtml(msgOnvio) + "</p>";
      box.classList.add(dataUnecont.success && dataOnvio.success ? "success" : "error");
    } catch (err) {
      box.innerHTML = "<p class=\"error\">Erro: " + escapeHtml(err.message || "Conexão") + "</p>";
      box.classList.add("error");
    } finally {
      setLoading(btn, false);
    }
  });

  // --- Editar / Atualizar (submit) ---
  document.getElementById("form-editar").addEventListener("submit", async function (e) {
    e.preventDefault();
    const certificadoId = document.getElementById("editar-id").value.trim();
    const file = document.getElementById("editar-certificado").files[0];
    const senha = document.getElementById("editar-senha").value.trim();
    if (!certificadoId) {
      showMsg("editar-resultado", false, "Busque o ID pelo CNPJ antes de atualizar.");
      return;
    }
    if (!file || !senha) {
      showMsg("editar-resultado", false, "Arquivo e senha do certificado são obrigatórios.");
      return;
    }
    var btn = document.getElementById("btn-editar");
    setLoading(btn, true);
    var formData = new FormData();
    formData.append("certificadoId", certificadoId);
    formData.append("certificado", file);
    formData.append("senha", senha);
    var uf = (document.getElementById("editar-uf") && document.getElementById("editar-uf").value) || "";
    if (uf) formData.append("uf", uf);
    try {
      var res = await fetch("/api/certificado/editar", { method: "POST", body: formData });
      var texto = await res.text();
      var data = parseRespostaComoJson(res, texto);
      showMsg("editar-resultado", data.success === true, data.message || data.mensagem || (data.success ? "Certificado atualizado." : "Erro."));
    } catch (err) {
      showMsg("editar-resultado", false, err.message || "Erro de conexão.");
    } finally {
      setLoading(btn, false);
    }
  });
})();
