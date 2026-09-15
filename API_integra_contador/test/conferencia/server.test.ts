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

  test("GET /api/history/company valida a empresa e retorna o contrato resumido", async () => {
    const invalid = await fetch("http://localhost:3099/api/history/company");
    expect(invalid.status).toBe(400);

    const res = await fetch("http://localhost:3099/api/history/company?codiEmp=101&limit=6");
    expect(res.status).toBe(200);
    const list = (await res.json()) as any[];
    expect(Array.isArray(list)).toBe(true);
    for (const item of list) {
      expect(Object.keys(item).sort()).toEqual([
        "competencia",
        "dataUltimaConsulta",
        "diferencaGeral",
        "status",
        "totalGeralDctfweb",
        "totalGeralDominio",
      ]);
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

  test("Módulo Simples Nacional: PGDAS-D, Geração de DAS, Extrato e DEFIS", async () => {
    const cnpj = "12345678000195";

    // 1. Consultar PGDAS-D
    const declRes = await fetch("http://localhost:3099/api/simples/declaracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, periodoApuracao: "202608", forceRefresh: true }),
    });
    expect(declRes.status).toBe(200);
    const declData = (await declRes.json()) as any;
    expect(declData.cnpj).toBe(cnpj);
    expect(Array.isArray(declData.declaracoes)).toBe(true);
    expect(declData.declaracoes.length).toBeGreaterThan(0);

    // 2. Gerar DAS com PDF e composição
    const dasRes = await fetch("http://localhost:3099/api/simples/gerar-das", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, periodoApuracao: "202608" }),
    });
    expect(dasRes.status).toBe(200);
    const dasData = (await dasRes.json()) as any;
    expect(dasData.pdfBase64).toBeDefined();
    expect(dasData.valorTotal).toBeGreaterThan(0);
    expect(Array.isArray(dasData.composicao)).toBe(true);

    // 3. Extrato do DAS
    const extRes = await fetch("http://localhost:3099/api/simples/extrato-das", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, numeroDas: "07.2026.998877" }),
    });
    expect(extRes.status).toBe(200);
    const extData = (await extRes.json()) as any;
    expect(extData.pdfBase64).toBeDefined();

    // 4. DEFIS Anual
    const defisRes = await fetch("http://localhost:3099/api/simples/defis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, forceRefresh: true }),
    });
    expect(defisRes.status).toBe(200);
    const defisData = (await defisRes.json()) as any;
    expect(Array.isArray(defisData.defis)).toBe(true);

    // 5. Listar do cache
    const listRes = await fetch("http://localhost:3099/api/simples/list");
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any[];
    expect(listData.some((i) => i.cnpj === cnpj)).toBe(true);
  });

  test("Módulo Parcelamentos: pedidos de acordo, parcelas e emissão de DAS", async () => {
    const cnpj = "98765432000109";

    // 1. Consultar Pedidos / Acordos
    const pedRes = await fetch("http://localhost:3099/api/parcelamentos/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, modalidade: "PARCSN", forceRefresh: true }),
    });
    expect(pedRes.status).toBe(200);
    const pedData = (await pedRes.json()) as any;
    expect(pedData.modalidade).toBe("PARCSN");
    expect(Array.isArray(pedData.pedidos)).toBe(true);

    // 2. Consultar Parcelas Disponíveis
    const parcRes = await fetch("http://localhost:3099/api/parcelamentos/parcelas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, modalidade: "PARCSN", forceRefresh: true }),
    });
    expect(parcRes.status).toBe(200);
    const parcData = (await parcRes.json()) as any;
    expect(Array.isArray(parcData.parcelas)).toBe(true);
    expect(parcData.parcelas.length).toBeGreaterThan(0);

    // 3. Gerar DAS da Parcela
    const dasParcRes = await fetch("http://localhost:3099/api/parcelamentos/gerar-das", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, parcela: "202609", modalidade: "PARCSN" }),
    });
    expect(dasParcRes.status).toBe(200);
    const dasParcData = (await dasParcRes.json()) as any;
    expect(dasParcData.pdfBase64).toBeDefined();
    expect(dasParcData.parcela).toBe("202609");

    // 4. Listar do cache
    const listRes = await fetch("http://localhost:3099/api/parcelamentos/list");
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any[];
    expect(listData.some((i) => i.cnpj === cnpj)).toBe(true);
  });

  test("Módulo Procurações RFB: consulta, alertas de vigência e vínculos REDESIM", async () => {
    const cnpj = "12345678000195";

    // 1. Consultar procuração do cliente
    const procRes = await fetch("http://localhost:3099/api/procuracoes/consultar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, forceRefresh: true }),
    });
    expect(procRes.status).toBe(200);
    const procData = (await procRes.json()) as any;
    expect(procData.cnpj).toBe(cnpj);
    expect(procData.statusGeral).toBeDefined();
    expect(Array.isArray(procData.procuracoes)).toBe(true);

    // 2. Listar procurações persistidas no banco
    const listRes = await fetch("http://localhost:3099/api/procuracoes/lista");
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as any[];
    expect(Array.isArray(listData)).toBe(true);
    expect(listData.some((p) => p.cnpj === cnpj)).toBe(true);

    // 3. Consultar vínculos do contador
    const vincRes = await fetch("http://localhost:3099/api/procuracoes/vinculos-contador");
    expect(vincRes.status).toBe(200);
    const vincData = (await vincRes.json()) as any;
    expect(Array.isArray(vincData.cnpjs)).toBe(true);
  });

  test("Módulo Worker Noturno / Varredura Automática em Segundo Plano", async () => {
    // 1. Disparar execução de amostra
    const runRes = await fetch("http://localhost:3099/api/worker/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 2 }),
    });
    expect(runRes.status).toBe(200);
    const runData = (await runRes.json()) as any;
    expect(runData.message).toContain("Varredura iniciada");

    // Aguardar pequena fração para processamento inicial
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 2. Checar status
    const statRes = await fetch("http://localhost:3099/api/worker/status");
    expect(statRes.status).toBe(200);
    const statData = (await statRes.json()) as any;
    expect(statData.current).toBeDefined();

    // 3. Listar histórico
    const histRes = await fetch("http://localhost:3099/api/worker/historico");
    expect(histRes.status).toBe(200);
    const histData = (await histRes.json()) as any[];
    expect(Array.isArray(histData)).toBe(true);
  });

  test("Módulo MEI Expresso: CCMEI, DAS-MEI e Dívida Ativa", async () => {
    const cnpj = "12345678000195";

    // 1. Emissão de CCMEI em PDF
    const ccmeiRes = await fetch("http://localhost:3099/api/mei/ccmei", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj }),
    });
    expect(ccmeiRes.status).toBe(200);
    const ccmeiData = (await ccmeiRes.json()) as any;
    expect(ccmeiData.cnpj).toBe(cnpj);
    expect(ccmeiData.pdfBase64).toBeDefined();

    // 2. Geração de DAS-MEI
    const dasMeiRes = await fetch("http://localhost:3099/api/mei/das", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, periodoApuracao: "202608" }),
    });
    expect(dasMeiRes.status).toBe(200);
    const dasMeiData = (await dasMeiRes.json()) as any;
    expect(dasMeiData.cnpj).toBe(cnpj);
    expect(dasMeiData.pdfBase64).toBeDefined();
    expect(dasMeiData.valorTotal).toBeDefined();

    // 3. Consulta de Dívida Ativa MEI
    const daRes = await fetch("http://localhost:3099/api/mei/divida-ativa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj, anoCalendario: "2026" }),
    });
    expect(daRes.status).toBe(200);
    const daData = (await daRes.json()) as any;
    expect(daData.cnpj).toBe(cnpj);
    expect(Array.isArray(daData.debitos)).toBe(true);
  });

  test("Módulo Sicalc: cálculo de acréscimos legais e emissão de DARF", async () => {
    const res = await fetch("http://localhost:3099/api/sicalc/gerar-darf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: "12345678000195",
        codigoReceita: "0190",
        dataPA: "08/2026",
        valorImposto: 1250.5,
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.pdfBase64).toBeDefined();
    expect(data.numeroDocumento).toBeDefined();
    expect(data.valorTotal).toBeGreaterThan(0);
  });

  test("Integração Obsidian Dossiê e Kit Mensal de Guias", async () => {
    const cnpj = "12345678000195";

    // 1. Dossiê Fiscal Obsidian em Markdown
    const dossieRes = await fetch(`http://localhost:3099/api/obsidian/dossie/${cnpj}`);
    expect(dossieRes.status).toBe(200);
    const dossieData = (await dossieRes.json()) as any;
    expect(dossieData.cnpj).toBe(cnpj);
    expect(dossieData.markdown).toContain("---");
    expect(dossieData.markdown).toContain("tipo: dossie_fiscal");
    expect(dossieData.markdown).toContain("Dossiê Fiscal");

    // 2. Kit Mensal de Fechamento da Empresa
    const kitRes = await fetch(`http://localhost:3099/api/empresas/${cnpj}/kit-mensal/2026-08`);
    expect(kitRes.status).toBe(200);
    const kitData = (await kitRes.json()) as any;
    expect(kitData.cnpj).toBe(cnpj);
    expect(Array.isArray(kitData.guias)).toBe(true);
    expect(kitData.guias.length).toBeGreaterThanOrEqual(3);
    expect(kitData.situacaoGeral).toBeDefined();
  });

  test("Módulo Parcelamentos PGFN: cadastro, listagem, auditoria e exclusão", async () => {
    const cnpj = "12345678000195";

    // 1. Cadastrar acordo PGFN
    const postRes = await fetch("http://localhost:3099/api/parcelamentos-pgfn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj,
        razao_social: "EMPRESA TESTE PGFN LTDA",
        numero_negociacao: "98.765.432-1",
        modalidade: "Transação Tributária - Edital PGDAU",
        codigo_receita: "1734",
        valor_parcela: 420.50,
        dia_vencimento: 30,
      }),
    });
    expect(postRes.status).toBe(200);
    const created = (await postRes.json()) as any;
    expect(created.id).toBeDefined();
    expect(created.numero_negociacao).toBe("98.765.432-1");

    // 2. Listar acordos PGFN
    const listRes = await fetch("http://localhost:3099/api/parcelamentos-pgfn");
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as any[];
    expect(list.some((a) => a.id === created.id)).toBe(true);

    // 3. Auditar acordo PGFN
    const auditRes = await fetch(`http://localhost:3099/api/parcelamentos-pgfn/${created.id}/auditar`, {
      method: "POST",
    });
    expect(auditRes.status).toBe(200);
    const audited = (await auditRes.json()) as any;
    expect(audited.ultima_auditoria).toBeDefined();
    expect(audited.status).toBeDefined();

    // 4. Kit Mensal agora deve incluir o acordo PGFN
    const kitRes = await fetch(`http://localhost:3099/api/empresas/${cnpj}/kit-mensal/2026-08`);
    const kitData = (await kitRes.json()) as any;
    expect(kitData.guias.some((g: any) => g.tipo.includes("DARF PGFN"))).toBe(true);

    // 5. Excluir acordo
    const delRes = await fetch(`http://localhost:3099/api/parcelamentos-pgfn/${created.id}`, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);
  });
});
