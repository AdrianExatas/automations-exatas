const flash = document.getElementById("flash");
const form = document.getElementById("form");

function showFlash(msg, ok = true) {
  if (!flash) return;
  flash.textContent = msg;
  flash.className = `flash show ${ok ? "ok" : "err"}`;
}

function formatApiError(data, status) {
  if (!data || typeof data !== "object") {
    return `Falha no envio (HTTP ${status})`;
  }
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (data.type === "validation") {
    const path = data.property || data.errors?.[0]?.path || "";
    if (String(path).includes("video")) {
      return "Selecione o vídeo da execução antes de enviar.";
    }
    return data.summary || data.message || "Dados inválidos no formulário.";
  }
  if (typeof data.message === "string") return data.message;
  return `Falha no envio (HTTP ${status})`;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const videoInput = form.querySelector("#video");
  if (!videoInput?.files?.length) {
    showFlash("Selecione o vídeo da execução antes de enviar.", false);
    videoInput?.focus();
    return;
  }

  const fd = new FormData();
  const fields = [
    "setor",
    "atividade",
    "responsavel",
    "sistema",
    "frequencia",
    "prazo",
    "observacoes",
    "updateOfCode",
  ];
  for (const name of fields) {
    const el = form.elements.namedItem(name);
    if (!el || typeof el === "RadioNodeList") continue;
    const value = String(el.value ?? "").trim();
    if (value) fd.set(name, value);
  }

  // Campos obrigatórios de texto: garantir que não vão vazios
  for (const name of ["setor", "atividade", "responsavel", "sistema", "frequencia", "prazo"]) {
    if (!fd.get(name)) {
      showFlash(`Preencha o campo: ${name}.`, false);
      form.elements.namedItem(name)?.focus?.();
      return;
    }
  }

  fd.set("video", videoInput.files[0]);

  const attachInput = form.querySelector("#attachments");
  if (attachInput?.files?.length) {
    for (const file of attachInput.files) {
      fd.append("attachments", file);
    }
  }

  const docs = [...form.querySelectorAll('input[name="doc"]:checked')].map(
    (el) => el.value,
  );
  // Enviar CSV simples — evita o parser multipart converter JSON em array
  fd.set("documentos", (docs.length ? docs : ["it", "form"]).join(","));

  const btn = form.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enviando...";
  }

  try {
    const res = await fetch("/api/submissions", { method: "POST", body: fd });
    let data = {};
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(text || `Falha no envio (HTTP ${res.status})`);
    }
    if (!res.ok) throw new Error(formatApiError(data, res.status));
    showFlash(`Solicitação ${data.id} criada. Status: ${data.status}`);
    form.reset();
    window.location.href = `/validacao?id=${data.id}`;
  } catch (err) {
    showFlash(err.message || String(err), false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Enviar para processamento";
    }
  }
});
