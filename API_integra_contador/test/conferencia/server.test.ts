import { describe, test, expect, afterAll } from "bun:test";
import { createServer } from "../../Dominio/reinf-dctfweb-conferencia/src/server.ts";

describe("Servidor Web e API REST", () => {
  const { server } = createServer({ port: 3099, useMock: true });

  afterAll(() => {
    server.stop();
  });

  test("GET / serve a interface HTML principal", async () => {
    const res = await fetch("http://localhost:3099/");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Conferência Fiscal 360°");
    expect(text).toContain("EFD-REINF × DCTFWEB × DOMÍNIO");
  });

  test("GET /api/status retorna status e configurações mascaradas", async () => {
    const res = await fetch("http://localhost:3099/api/status");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe("ONLINE");
    expect(data.mockMode).toBe(true);
    expect(data.config).toBeDefined();
  });

  test("GET /api/companies lista as empresas ativas do Domínio", async () => {
    const res = await fetch("http://localhost:3099/api/companies");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].codiEmp).toBeDefined();
    expect(data[0].cnpj).toBeDefined();
    expect(data[0].ativo).toBeDefined();
    expect(data[0].situacao).toBeDefined();
  });

  test("GET /api/dominio/competencias lista competências com movimento", async () => {
    const res = await fetch("http://localhost:3099/api/dominio/competencias");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].competencia).toBeDefined();
  });

  test("GET /api/dominio/overview captura informações das empresas do Domínio com status ativo/inativo", async () => {
    const res = await fetch("http://localhost:3099/api/dominio/overview?competencia=2026-01");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].empresa).toBeDefined();
    expect(data[0].empresa.ativo).toBeDefined();
    expect(data[0].empresa.situacao).toBeDefined();
    expect(data[0].totalGeralDominio).toBeDefined();
    // Empresa 107 mockada como Inativa ('I')
    const inativa = data.find((d) => d.empresa.codiEmp === "107");
    expect(inativa).toBeDefined();
    expect(inativa.empresa.ativo).toBe(false);
    expect(inativa.empresa.situacao).toBe("I");
  });

  test("POST /api/estimate calcula estimativa prévia de chamadas e economia com cache", async () => {
    // Estimativa com reaproveitamento de cache
    const res = await fetch("http://localhost:3099/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencia: "2026-01" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.totalEmpresas).toBeGreaterThan(0);
    expect(data.chamadasEstimadas).toBe(data.totalEmpresas - (data.totalEmCache || 0));

    // Estimativa forçando reconsulta (bypassa cache)
    const resForce = await fetch("http://localhost:3099/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencia: "2026-01", forceRefresh: true }),
    });
    expect(resForce.status).toBe(200);
    const dataForce = (await resForce.json()) as any;
    expect(dataForce.chamadasEstimadas).toBe(dataForce.totalEmpresas);
  });

  test("GET /api/persisted recupera conciliações salvas no cache SQLite", async () => {
    const res = await fetch("http://localhost:3099/api/persisted?competencia=2026-01");
    expect(res.status).toBe(200);
    const list = (await res.json()) as any[];
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(list[0].empresa).toBeDefined();
      expect(list[0].origemConsulta).toBe("CACHE_PERSISTIDO");
      expect(list[0].dataUltimaConsulta).toBeDefined();
    }
  });

  test("POST /api/reconcile/batch rejeita sem confirmação e processa com confirmação", async () => {
    // Sem confirmação
    const resDenied = await fetch("http://localhost:3099/api/reconcile/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencia: "2026-01", confirmed: false }),
    });
    expect(resDenied.status).toBe(400);

    // Com confirmação
    const resOk = await fetch("http://localhost:3099/api/reconcile/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencia: "2026-01", confirmed: true }),
    });
    expect(resOk.status).toBe(200);
    const summary = (await resOk.json()) as any;
    expect(summary.totalEmpresas).toBe(7);
    expect(summary.conformes).toBe(5);
    expect(summary.pendentes).toBe(2);
    expect(summary.resultados.length).toBe(7);
  });

  test("GET /api/export/latest baixa a planilha Excel formatada", async () => {
    const res = await fetch("http://localhost:3099/api/export/latest");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml");
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(5000);
  });

  test("Módulo Situação Fiscal (SITFIS/CND): solicitar, consultar, listar e baixar PDF", async () => {
    const cnpj = "12345678000195";

    // 1. Solicitar Protocolo
    const protoRes = await fetch("http://localhost:3099/api/sitfis/solicitar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj }),
    });
    expect(protoRes.status).toBe(200);
    const protoData = (await protoRes.json()) as any;
    expect(protoData.protocolo).toBeDefined();

    // 2. Obter Relatório / Certidão
    const relRes = await fetch("http://localhost:3099/api/sitfis/relatorio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, protocolo: protoData.protocolo, forceRefresh: true }),
    });
    expect(relRes.status).toBe(200);
    const relData = (await relRes.json()) as any;
    expect(relData.cnpj).toBe(cnpj);
    expect(relData.situacao).toBe("REGULAR");
    expect(relData.temPdf).toBe(true);

    // 3. Listar Resultados Persistidos
    const listRes = await fetch("http://localhost:3099/api/sitfis/list");
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any[];
    expect(listData.some((i) => i.cnpj === cnpj)).toBe(true);

    // 4. Download do PDF
    const downRes = await fetch(`http://localhost:3099/api/sitfis/download?cnpj=${cnpj}`);
    expect(downRes.status).toBe(200);
    expect(downRes.headers.get("Content-Type")).toBe("application/pdf");
    const pdfBuf = await downRes.arrayBuffer();
    expect(pdfBuf.byteLength).toBeGreaterThan(50);
  });

  test("Módulo Caixa Postal & DTE: indicador de mensagens e listagem oficial", async () => {
    const cnpj = "98765432000109";

    // 1. Indicador Rápido de Novas Mensagens
    const indRes = await fetch("http://localhost:3099/api/caixapostal/indicador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj }),
    });
    expect(indRes.status).toBe(200);
    const indData = (await indRes.json()) as any;
    expect(indData.cnpj).toBe(cnpj);
    expect(indData.indicadorMensagensNovas).toBeDefined();

    // 2. Listagem de Mensagens
    const msgRes = await fetch("http://localhost:3099/api/caixapostal/mensagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, forceRefresh: true }),
    });
    expect(msgRes.status).toBe(200);
    const msgData = (await msgRes.json()) as any;
    expect(msgData.cnpj).toBe(cnpj);
    expect(Array.isArray(msgData.mensagens)).toBe(true);
    expect(msgData.mensagens.length).toBeGreaterThan(0);

    // 3. Listar Caixas Postais salvas
    const listRes = await fetch("http://localhost:3099/api/caixapostal/list");
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any[];
    expect(listData.some((i) => i.cnpj === cnpj)).toBe(true);
  });

  test("Módulo Pagamentos Arrecadados e Emissão de Comprovante Bancário", async () => {
    const cnpj = "55443322000111";

    // 1. Consultar Pagamentos
    const pagRes = await fetch("http://localhost:3099/api/pagamentos/consultar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, forceRefresh: true }),
    });
    expect(pagRes.status).toBe(200);
    const pagData = (await pagRes.json()) as any;
    expect(pagData.cnpj).toBe(cnpj);
    expect(Array.isArray(pagData.pagamentos)).toBe(true);
    expect(pagData.pagamentos.length).toBeGreaterThan(0);
    const numDoc = pagData.pagamentos[0].numeroDocumento;

    // 2. Emitir Comprovante de Arrecadação (PDF Base64)
    const compRes = await fetch("http://localhost:3099/api/pagamentos/comprovante", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, numeroDocumento: numDoc }),
    });
    expect(compRes.status).toBe(200);
    const compData = (await compRes.json()) as any;
    expect(compData.cnpj).toBe(cnpj);
    expect(compData.numeroDocumento).toBe(numDoc);
    expect(compData.pdfBase64).toBeDefined();

    // 3. Listar pagamentos
    const listRes = await fetch(`http://localhost:3099/api/pagamentos/list?cnpj=${cnpj}`);
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any[];
    expect(Array.isArray(listData)).toBe(true);
  });

  test("Emissão de Guia DARF DCTFWeb oficial com código de barras", async () => {
    const res = await fetch("http://localhost:3099/api/guias/darf-dctfweb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj: "12345678000195", competencia: "2026-08" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.cnpj).toBe("12345678000195");
    expect(data.competencia).toBe("2026-08");
    expect(data.pdfBase64).toBeDefined();
    expect(data.pdfBase64.length).toBeGreaterThan(50);
  });
});

