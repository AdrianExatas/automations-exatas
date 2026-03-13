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
    var select = document.getElementById("editar-uf");
    if (!select) return;
    LISTA_UF.forEach(function (u) {
      var opt = document.createElement("option");
      opt.value = u.sigla;
      opt.textContent = u.nome + " (" + u.sigla + ")";
      select.appendChild(opt);
    });
  })();

  // --- Abas ---
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
    });
  });

  // --- Registrar ---
  document.getElementById("form-registrar").addEventListener("submit", async function (e) {
    e.preventDefault();
    const file = document.getElementById("reg-certificado").files[0];
    const senha = document.getElementById("reg-senha").value.trim();
    const cnpj = document.getElementById("reg-cnpj").value.trim();
    if (!file || !senha) {
      showMsg("registrar-resultado", false, "Arquivo e senha são obrigatórios.");
      return;
    }
    const btn = document.getElementById("btn-registrar");
    setLoading(btn, true);
    const formData = new FormData();
    formData.append("certificado", file);
    formData.append("senha", senha);
    if (cnpj) formData.append("cnpj", cnpj);
    try {
      const res = await fetch("/api/certificado/registrar", { method: "POST", body: formData });
      const texto = await res.text();
      const data = parseRespostaComoJson(res, texto);
      showMsg("registrar-resultado", data.success === true, data.message || data.mensagem || (data.success ? "Registrado." : "Erro."));
    } catch (err) {
      showMsg("registrar-resultado", false, err.message || "Erro de conexão.");
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

  // Extrair CNPJ do PFX no navegador (node-forge) e listar certificados para achar o ID por match de CnpjCpf
  function arrayBufferToBinaryString(ab) {
    const bytes = new Uint8Array(ab);
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function extrairCnpjDoPfxNoNavegador(binaryStr, senha) {
    if (typeof forge === "undefined") {
      throw new Error("Biblioteca forge não carregada. Recarregue a página.");
    }
    const asn1 = forge.asn1.fromDer(binaryStr);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, senha, false);
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    if (!certBag || certBag.length === 0) return null;
    const cert = certBag[0].cert;
    if (!cert || !cert.subject || !cert.subject.attributes) return null;
    const subjectStr = cert.subject.attributes
      .map(function (attr) {
        return (attr.shortName || "") + "=" + (attr.value || "");
      })
      .join(", ");
    const match = subjectStr.match(/\d{14}/);
    return match ? match[0] : null;
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
