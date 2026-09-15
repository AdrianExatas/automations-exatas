/**
 * Servidor Web nativo Bun para o Painel de Conferência Fiscal
 * Servidor rápido, seguro e sem dependências pesadas.
 */
import { resolve, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { networkInterfaces } from "node:os";

import { loadConfig, sanitizeConfig } from "./config.ts";
import { DominioOdbcClient } from "./dominio/client.ts";
import { DominioMockAdapter, createDefaultMockDctfwebProvider } from "./dominio/mock_adapter.ts";
import { SerproAuthManager } from "./serpro/auth.ts";
import { SerproClient } from "./serpro/client.ts";
import { DctfwebService } from "./serpro/dctfweb_service.ts";
import { SitfisService } from "./serpro/sitfis_service.ts";
import { CaixaPostalService } from "./serpro/caixapostal_service.ts";
import { PagamentoService } from "./serpro/pagamento_service.ts";
import { SqliteStorage } from "./storage/sqlite.ts";
import { ExcelExporter } from "./export/excel.ts";
import { ConferenciaOrchestrator } from "./orchestrator.ts";
import type { BatchSummary } from "./types.ts";

export const MINIMAL_MOCK_PDF_BASE64 = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n",
  "utf-8",
).toString("base64");

export function getLocalIpAddress(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    if (name.toLowerCase().includes("loopback") || name.toLowerCase().includes("vethernet")) continue;
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

export function createServer(options?: {
  port?: number;
  useMock?: boolean;
  hostname?: string;
}) {
  const config = loadConfig();
  const port = options?.port || config.port || 3000;
  const hostname = options?.hostname || "0.0.0.0";
  const useMock = options?.useMock ?? (!config.serproConsumerKey || !config.serproCertPfxPath);

  const dominioClient = useMock
    ? new DominioMockAdapter()
    : new DominioOdbcClient({
        dsn: config.dominioOdbcDsn,
        user: config.dominioUser,
        password: config.dominioPassword,
      });

  let dctfwebService: DctfwebService | undefined;
  let sitfisService: SitfisService | undefined;
  let caixapostalService: CaixaPostalService | undefined;
  let pagamentoService: PagamentoService | undefined;
  let mockProvider: ((cnpj: string, comp: string) => Promise<string | null>) | undefined;

  if (useMock) {
    mockProvider = createDefaultMockDctfwebProvider();
  } else {
    const authManager = new SerproAuthManager({
      consumerKey: config.serproConsumerKey,
      consumerSecret: config.serproConsumerSecret,
      certificatePfxPath: config.serproCertPfxPath,
      certificatePassword: config.serproCertPassword,
    });
    const client = new SerproClient(authManager, config.serproContratanteCnpj);
    dctfwebService = new DctfwebService(client);
    sitfisService = new SitfisService(client);
    caixapostalService = new CaixaPostalService(client);
    pagamentoService = new PagamentoService(client);
  }

  const storage = new SqliteStorage(config.sqliteDbPath);
  const orchestrator = new ConferenciaOrchestrator({
    dominioClient,
    dctfwebService,
    sqliteStorage: storage,
    mockDctfwebProvider: mockProvider,
  });

  const exporter = new ExcelExporter();
  let latestSummary: BatchSummary | null = null;

  const publicDir = resolve(import.meta.dir, "ui/public");

  const server = Bun.serve({
    port,
    hostname,
    async fetch(req) {
      const url = new URL(req.url);
      const method = req.method;

      // Rotas da API REST
      if (url.pathname === "/api/status") {
        const lanIp = getLocalIpAddress();
        return Response.json({
          status: "ONLINE",
          mockMode: useMock,
          dominio: {
            dsn: config.dominioOdbcDsn,
            user: config.dominioUser,
          },
          network: {
            port,
            lanIp,
            lanUrl: `http://${lanIp}:${port}`,
          },
          config: sanitizeConfig(config),
        });
      }

      if (url.pathname === "/api/dominio/competencias") {
        try {
          const comps = await orchestrator.listCompetencias();
          return Response.json(comps);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/dominio/overview") {
        try {
          const comp = url.searchParams.get("competencia") || "2026-08";
          const overview = await orchestrator.getDominioOverview(comp);
          return Response.json(overview);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/persisted") {
        try {
          const comp = url.searchParams.get("competencia") || "2026-08";
          const persisted = orchestrator.getPersistedResults(comp);
          return Response.json(persisted);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/companies") {
        try {
          const companies = await orchestrator.listCompanies();
          return Response.json(companies);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/estimate" && method === "POST") {
        try {
          const body = (await req.json()) as {
            competencia?: string;
            apenasComMovimento?: boolean;
            escopo?: "MOVIMENTO" | "FECHAMENTO" | "TODAS";
            forceRefresh?: boolean;
          };
          const comp = body.competencia || "2026-08";
          const escopo = body.escopo || (body.apenasComMovimento ? "MOVIMENTO" : "TODAS");
          const estimate = await orchestrator.estimateSerproCalls(
            comp,
            escopo,
            Boolean(body.forceRefresh),
          );
          return Response.json(estimate);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/reconcile/batch" && method === "POST") {
        try {
          const body = (await req.json()) as {
            competencia?: string;
            confirmed?: boolean;
            apenasComMovimento?: boolean;
            escopo?: "MOVIMENTO" | "FECHAMENTO" | "TODAS";
            forceRefresh?: boolean;
          };
          const comp = body.competencia || "2026-08";
          if (!body.confirmed) {
            return Response.json(
              { error: "Confirmação de tarifação SERPRO obrigatória." },
              { status: 400 },
            );
          }
          const escopo = body.escopo || (body.apenasComMovimento ? "MOVIMENTO" : "TODAS");
          const summary = await orchestrator.reconcileBatch(comp, undefined, {
            escopo,
            forceRefresh: Boolean(body.forceRefresh),
          });
          latestSummary = summary;
          return Response.json(summary);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/reconcile/single" && method === "POST") {
        try {
          const body = (await req.json()) as {
            competencia?: string;
            codiEmp?: string;
            forceRefresh?: boolean;
          };
          if (!body.codiEmp) {
            return Response.json({ error: "Identificador da empresa obrigatório." }, { status: 400 });
          }
          const comp = body.competencia || "2026-08";
          const res = await orchestrator.reconcileCompany(comp, body.codiEmp, Boolean(body.forceRefresh));

          // Atualizar ou criar latestSummary para permitir exportação Excel imediata
          if (!latestSummary || latestSummary.competencia !== comp) {
            latestSummary = {
              competencia: comp,
              totalEmpresas: 1,
              conformes: res.status === "CONFORME" ? 1 : 0,
              divergentes: res.status === "DIVERGENTE" ? 1 : 0,
              pendentes: res.status === "PENDENTE" ? 1 : 0,
              semDctfweb: res.status === "SEM_DCTFWEB" ? 1 : 0,
              erros: res.status === "ERRO" ? 1 : 0,
              tempoExecucaoMs: 0,
              chamadasSerproEstimadas: 1,
              chamadasSerproRealizadas: 1,
              resultados: [res],
            };
          } else {
            const existingIdx = latestSummary.resultados.findIndex(
              (r) => r.empresa.codiEmp === res.empresa.codiEmp,
            );
            if (existingIdx >= 0) {
              latestSummary.resultados[existingIdx] = res;
            } else {
              latestSummary.resultados.push(res);
            }
            latestSummary.totalEmpresas = latestSummary.resultados.length;
            latestSummary.conformes = latestSummary.resultados.filter((r) => r.status === "CONFORME").length;
            latestSummary.divergentes = latestSummary.resultados.filter((r) => r.status === "DIVERGENTE").length;
            latestSummary.pendentes = latestSummary.resultados.filter((r) => r.status === "PENDENTE").length;
            latestSummary.semDctfweb = latestSummary.resultados.filter((r) => r.status === "SEM_DCTFWEB").length;
            latestSummary.erros = latestSummary.resultados.filter((r) => r.status === "ERRO").length;
            latestSummary.chamadasSerproRealizadas = latestSummary.resultados.length;
          }

          return Response.json(res);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/history") {
        try {
          const executions = storage.listExecutions();
          return Response.json(executions);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // Rotas Situação Fiscal (SITFIS / CND)
      if (url.pathname === "/api/sitfis/solicitar" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          let protocolo = `SITFIS-${cnpj}-${Date.now().toString(36).toUpperCase()}`;
          let tempoEspera = 0;

          if (!useMock && sitfisService) {
            const protoRes = await sitfisService.solicitarProtocolo(cnpj);
            protocolo = protoRes.protocoloRelatorio;
            tempoEspera = protoRes.tempoEspera;
          }

          storage.saveSitfisResult(cnpj, {
            protocolo,
            situacao: "PROCESSANDO",
            mensagens: [{ codigo: "001", texto: "Protocolo gerado com sucesso" }],
          });

          return Response.json({ protocolo, tempoEspera });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/sitfis/relatorio" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; protocolo?: string; forceRefresh?: boolean };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          if (!body.forceRefresh) {
            const cached = storage.getSitfisResult(cnpj);
            if (cached && cached.pdf_base64) {
              return Response.json({
                cnpj,
                protocolo: cached.protocolo,
                situacao: cached.situacao,
                dataConsulta: cached.data_consulta,
                temPdf: true,
                origem: "CACHE",
                mensagens: cached.mensagens,
              });
            }
          }

          let pdfBase64 = MINIMAL_MOCK_PDF_BASE64;
          let situacao = "REGULAR";
          let statusHttp = 200;
          let mensagens: Array<{ codigo: string; texto: string }> = [];

          if (!useMock && sitfisService && body.protocolo) {
            const relRes = await sitfisService.obterRelatorio(cnpj, body.protocolo);
            pdfBase64 = relRes.pdfBase64 || "";
            situacao = relRes.situacaoGeral || "REGULAR";
            statusHttp = relRes.status;
            mensagens = relRes.mensagens;
          } else {
            mensagens = [{ codigo: "000", texto: "Certidão de Regularidade Fiscal RFB/PGFN Negativa emitida com sucesso" }];
          }

          storage.saveSitfisResult(cnpj, {
            protocolo: body.protocolo || null,
            situacao,
            pdfBase64,
            mensagens,
          });

          return Response.json({
            cnpj,
            protocolo: body.protocolo,
            situacao,
            dataConsulta: new Date().toISOString(),
            temPdf: Boolean(pdfBase64),
            origem: "LIVE",
            statusHttp,
            mensagens,
          });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/sitfis/list") {
        try {
          const list = storage.listAllSitfisResults();
          return Response.json(list);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/sitfis/download") {
        const cnpj = url.searchParams.get("cnpj") || "";
        const item = storage.getSitfisResult(cnpj);
        if (!item || !item.pdf_base64) {
          return new Response("Relatório PDF não localizado no cache.", { status: 404 });
        }
        const buf = Buffer.from(item.pdf_base64, "base64");
        return new Response(buf, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="situacao_fiscal_${cnpj}.pdf"`,
          },
        });
      }

      // Rotas Caixa Postal Fiscal & DTE
      if (url.pathname === "/api/caixapostal/indicador" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          let ind = 0;
          if (!useMock && caixapostalService) {
            const res = await caixapostalService.obterIndicadorNovasMensagens(cnpj);
            ind = res.indicadorMensagensNovas;
          } else {
            ind = cnpj.endsWith("4") || cnpj.endsWith("7") ? 1 : 0;
          }

          return Response.json({ cnpj, indicadorMensagensNovas: ind, temNovas: ind > 0 });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/caixapostal/mensagens" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; forceRefresh?: boolean };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          if (!body.forceRefresh) {
            const cached = storage.getCaixaPostalResult(cnpj);
            if (cached) return Response.json({ ...cached, origem: "CACHE" });
          }

          let mensagens: any[] = [];
          if (!useMock && caixapostalService) {
            const res = await caixapostalService.listarMensagens(cnpj);
            mensagens = res.listaMensagens;
          } else {
            mensagens = [
              {
                isn: 1001,
                assuntoModelo: "Aviso de Cobrança — Débitos em Aberto DCTFWeb",
                dataEnvio: "2026-09-01",
                horaEnvio: "10:30:00",
                indicadorLeitura: 0,
                descricaoOrigem: "Receita Federal do Brasil",
                relevancia: 2,
              },
              {
                isn: 1002,
                assuntoModelo: "Notificação de Atualização do Domicílio Tributário Eletrônico",
                dataEnvio: "2026-08-15",
                horaEnvio: "14:20:00",
                indicadorLeitura: 1,
                descricaoOrigem: "RFB / Simples Nacional",
                relevancia: 1,
              },
            ];
          }

          storage.saveCaixaPostalResult(cnpj, {
            indicadorNovas: mensagens.filter((m) => m.indicadorLeitura === 0).length > 0 ? 1 : 0,
            qtdMensagens: mensagens.length,
            mensagens,
          });

          return Response.json({
            cnpj,
            data_consulta: new Date().toISOString(),
            qtd_mensagens: mensagens.length,
            mensagens,
            origem: "LIVE",
          });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/caixapostal/list") {
        try {
          return Response.json(storage.listAllCaixaPostalResults());
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // Rotas Pagamentos Arrecadados
      if (url.pathname === "/api/pagamentos/consultar" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; forceRefresh?: boolean; dataInicial?: string; dataFinal?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          if (!body.forceRefresh) {
            const cached = storage.getPagamentosResult(cnpj);
            if (cached && cached.length > 0) return Response.json({ cnpj, pagamentos: cached, origem: "CACHE" });
          }

          let pagamentos: any[] = [];
          if (!useMock && pagamentoService) {
            pagamentos = await pagamentoService.consultarPagamentos(cnpj, {
              dataInicial: body.dataInicial,
              dataFinal: body.dataFinal,
            });
          } else {
            pagamentos = [
              {
                numeroDocumento: "07.2026.11223344",
                tipoDocumento: "DARF",
                periodoApuracao: "2026-08-31",
                dataArrecadacao: "2026-09-10",
                dataVencimento: "2026-09-20",
                receitaPrincipalCodigo: "1162-01",
                receitaPrincipalDescricao: "CPRB / Retenção Previdenciária",
                valorTotal: 1250.0,
                valorPrincipal: 1250.0,
                valorMulta: 0,
                valorJuros: 0,
              },
              {
                numeroDocumento: "07.2026.55667788",
                tipoDocumento: "DARF",
                periodoApuracao: "2026-08-31",
                dataArrecadacao: "2026-09-12",
                dataVencimento: "2026-09-20",
                receitaPrincipalCodigo: "1708-06",
                receitaPrincipalDescricao: "IRRF - Serviços Profissionais PJ",
                valorTotal: 450.0,
                valorPrincipal: 450.0,
                valorMulta: 0,
                valorJuros: 0,
              },
            ];
          }

          storage.savePagamentosResult(cnpj, pagamentos);
          return Response.json({ cnpj, pagamentos, dataConsulta: new Date().toISOString(), origem: "LIVE" });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/pagamentos/list") {
        try {
          const cnpj = url.searchParams.get("cnpj");
          if (cnpj) {
            return Response.json(storage.getPagamentosResult(cnpj));
          }
          return Response.json(storage.listAllPagamentos());
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/pagamentos/comprovante" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; numeroDocumento?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const numDoc = String(body.numeroDocumento || "").trim();
          if (!cnpj || !numDoc) {
            return Response.json({ error: "CNPJ e Número do Documento obrigatórios" }, { status: 400 });
          }

          let pdfBase64 = MINIMAL_MOCK_PDF_BASE64;
          if (!useMock && pagamentoService) {
            const res = await pagamentoService.emitirComprovante(cnpj, numDoc);
            if (res.pdfBase64) pdfBase64 = res.pdfBase64;
          }

          return Response.json({ cnpj, numeroDocumento: numDoc, pdfBase64 });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // Emissão de Guia DARF DCTFWeb
      if (url.pathname === "/api/guias/darf-dctfweb" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; competencia?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const comp = body.competencia || "2026-08";
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          let pdfBase64 = MINIMAL_MOCK_PDF_BASE64;
          if (!useMock && dctfwebService) {
            const res = await dctfwebService.gerarGuiaDarf({ contribuinteCnpj: cnpj, competencia: comp });
            pdfBase64 = res.pdfBase64;
          }

          return Response.json({ cnpj, competencia: comp, pdfBase64 });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/export/latest") {
        if (!latestSummary) {
          return new Response("Nenhum lote recente disponível para exportação.", { status: 404 });
        }
        try {
          const excelBuffer = await exporter.generateReport(latestSummary);
          return new Response(excelBuffer, {
            headers: {
              "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "Content-Disposition": `attachment; filename="conferencia_${latestSummary.competencia.replace("-", "_")}.xlsx"`,
            },
          });
        } catch (err: unknown) {
          return new Response(`Erro ao gerar Excel: ${String(err)}`, { status: 500 });
        }
      }

      // Arquivos Estáticos (UI)
      let filePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const fullPath = join(publicDir, filePath);

      if (existsSync(fullPath)) {
        const fileContent = readFileSync(fullPath);
        let contentType = "text/plain";
        if (filePath.endsWith(".html")) contentType = "text/html; charset=utf-8";
        else if (filePath.endsWith(".css")) contentType = "text/css; charset=utf-8";
        else if (filePath.endsWith(".js")) contentType = "application/javascript; charset=utf-8";
        else if (filePath.endsWith(".svg")) contentType = "image/svg+xml";

        return new Response(fileContent, {
          headers: { "Content-Type": contentType },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  return { server, orchestrator, storage };
}

if (import.meta.main) {
  const { server } = createServer();
  const lanIp = getLocalIpAddress();
  console.log(`\n======================================================`);
  console.log(`  Painel de Conferência REINF × DCTFWeb × Domínio`);
  console.log(`  Acesso Local:        http://localhost:${server.port}`);
  console.log(`  Rede Interna (LAN):  http://${lanIp}:${server.port}`);
  console.log(`======================================================\n`);
}
