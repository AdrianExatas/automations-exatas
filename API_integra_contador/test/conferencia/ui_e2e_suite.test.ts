import { describe, expect, it } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("Suíte E2E de Cobertura de Rotas e Telas da Interface", () => {
  it("Status e Conexões (Online & DSN)", async () => {
    const res = await fetch(`${BASE_URL}/api/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ONLINE");
    expect(data.dominio.dsn).toBeDefined();
    expect(data.config.dominioPassword).toBe("****");
  });

  it("Hub 1 — Declarações & DCTFWeb: Competências e Overview", async () => {
    const compRes = await fetch(`${BASE_URL}/api/dominio/competencias`);
    expect(compRes.status).toBe(200);
    const comps = await compRes.json();
    expect(Array.isArray(comps)).toBe(true);
    expect(comps.length).toBeGreaterThan(0);

    const overRes = await fetch(`${BASE_URL}/api/dominio/overview?competencia=2026-08`);
    expect(overRes.status).toBe(200);
    const over = await overRes.json();
    expect(Array.isArray(over)).toBe(true);
    expect(over.length).toBeGreaterThan(0);

    const persRes = await fetch(`${BASE_URL}/api/persisted?competencia=2026-08`);
    expect(persRes.status).toBe(200);
    const pers = await persRes.json();
    expect(Array.isArray(pers)).toBe(true);
    // Deve conter as empresas conciliadas
    expect(pers.length).toBeGreaterThanOrEqual(3);
  });

  it("Hub 1 — Simples Nacional (Listagem PGDAS-D)", async () => {
    const res = await fetch(`${BASE_URL}/api/simples/list`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  it("Hub 2 — Regularidade & Auditoria: SITFIS / CND", async () => {
    const res = await fetch(`${BASE_URL}/api/sitfis/list`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  it("Hub 2 — Regularidade & Auditoria: Parcelamentos PGFN", async () => {
    const res = await fetch(`${BASE_URL}/api/parcelamentos-pgfn`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  it("Hub 2 — Regularidade & Auditoria: Procurações RFB", async () => {
    const res = await fetch(`${BASE_URL}/api/procuracoes/lista`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  it("Hub 3 — Comunicação & Guias: Caixa Postal DTE", async () => {
    const res = await fetch(`${BASE_URL}/api/caixapostal/list`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  it("Hub 3 — Comunicação & Guias: Pagamentos Arrecadados", async () => {
    const res = await fetch(`${BASE_URL}/api/pagamentos/list`);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  it("Worker Noturno e Estimativa", async () => {
    const estRes = await fetch(`${BASE_URL}/api/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencia: "2026-08", apenasComMovimento: true }),
    });
    expect(estRes.status).toBe(200);
    const est = await estRes.json();
    expect(est.totalEmpresas).toBeGreaterThan(0);
    expect(typeof est.chamadasEstimadas).toBe("number");

    const stRes = await fetch(`${BASE_URL}/api/worker/status`);
    expect(stRes.status).toBe(200);
    const st = await stRes.json();
    expect(st.current).toBeDefined();
    expect(st.current.isRunning).toBe(false);
  });

  it("Integrações: Dossiê Obsidian e Kit Mensal", async () => {
    const obsRes = await fetch(`${BASE_URL}/api/obsidian/dossie/10741183000150`);
    expect(obsRes.status).toBe(200);
    const obs = await obsRes.json();
    expect(obs.markdown).toBeDefined();
    expect(obs.markdown).toContain("CLINICA INTEGRADA");

    const kitRes = await fetch(`${BASE_URL}/api/empresas/10741183000150/kit-mensal/2026-08`);
    expect(kitRes.status).toBe(200);
    const kit = await kitRes.json();
    expect(kit.guias).toBeDefined();
    expect(Array.isArray(kit.guias)).toBe(true);
  });
});
