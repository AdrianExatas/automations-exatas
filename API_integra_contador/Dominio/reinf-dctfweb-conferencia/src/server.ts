/**
 * Servidor Web nativo Bun para o Painel de Conferência Fiscal
 * Servidor rápido, seguro e sem dependências pesadas.
 */
import { resolve, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { createHmac, timingSafeEqual } from "node:crypto";

import { loadConfig, sanitizeConfig } from "./config.ts";
import { DominioOdbcClient } from "./dominio/client.ts";
import { DominioMockAdapter, createDefaultMockDctfwebProvider } from "./dominio/mock_adapter.ts";
import { SerproAuthManager } from "./serpro/auth.ts";
import { SerproClient } from "./serpro/client.ts";
import { DctfwebService } from "./serpro/dctfweb_service.ts";
import { SitfisService } from "./serpro/sitfis_service.ts";
import { CaixaPostalService } from "./serpro/caixapostal_service.ts";
import { PagamentoService } from "./serpro/pagamento_service.ts";
import { SimplesService } from "./serpro/simples_service.ts";
import { ParcelamentoService } from "./serpro/parcelamento_service.ts";
import { ProcuracaoService } from "./serpro/procuracao_service.ts";
import { MeiService } from "./serpro/mei_service.ts";
import { SicalcService } from "./serpro/sicalc_service.ts";
import { NightlyWorker } from "./worker/nightly_worker.ts";
import { ObsidianVaultSync } from "./obsidian/vault_sync.ts";
import { SqliteStorage } from "./storage/sqlite.ts";
import { ExcelExporter } from "./export/excel.ts";
import { ConferenciaOrchestrator } from "./orchestrator.ts";
import type { BatchSummary } from "./types.ts";

export const MINIMAL_MOCK_PDF_BASE64 = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n",
  "utf-8",
).toString("base64");

process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL] Unhandled Rejection in Server:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[CRITICAL] Uncaught Exception in Server:", err);
});

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

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  for (const cookie of cookieHeader.split(";")) {
    const parts = cookie.split("=");
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join("=").trim());
    }
  }
  return list;
}

export function createAuthToken(user: string, secret: string, ttlSeconds = 7 * 24 * 3600): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = Buffer.from(JSON.stringify({ user, exp: expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAuthToken(token: string, secret: string): { user: string; exp: number } | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    if (signature.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function createServer(options?: {
  port?: number;
  useMock?: boolean;
  hostname?: string;
  authEnabled?: boolean;
}) {
  const config = loadConfig();
  const port = options?.port || config.port || 3000;
  const hostname = options?.hostname || "0.0.0.0";
  const useMock = options?.useMock ?? (!config.serproConsumerKey || !config.serproCertPfxPath);
  const authEnabled = options?.authEnabled ?? (config.authEnabled || process.env.NODE_ENV === "production");

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
  let simplesService: SimplesService | undefined;
  let parcelamentoService: ParcelamentoService | undefined;
  let procuracaoService: ProcuracaoService | undefined;
  let meiService: MeiService | undefined;
  let sicalcService: SicalcService | undefined;
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
    simplesService = new SimplesService(client);
    parcelamentoService = new ParcelamentoService(client);
    procuracaoService = new ProcuracaoService(client, config.serproContratanteCnpj);
    meiService = new MeiService(client);
    sicalcService = new SicalcService(client);
  }

  const storage = new SqliteStorage(config.sqliteDbPath);
  const orchestrator = new ConferenciaOrchestrator({
    dominioClient,
    dctfwebService,
    sqliteStorage: storage,
    mockDctfwebProvider: mockProvider,
  });

  const nightlyWorker = new NightlyWorker(
    orchestrator,
    caixapostalService || ({} as any),
    sitfisService || ({} as any),
    procuracaoService || ({} as any),
    storage,
  );
  const obsidianSync = new ObsidianVaultSync(storage);

  const exporter = new ExcelExporter();
  const summariesByComp = new Map<string, BatchSummary>();

  function isValidCnpj(cnpj: string): boolean {
    const clean = String(cnpj || "").replace(/\D/g, "");
    return clean.length === 14;
  }

  const publicDir = resolve(import.meta.dir, "ui/public");

  const server = Bun.serve({
    port,
    hostname,
    async fetch(req) {
      const url = new URL(req.url);
      const method = req.method;

      function getAuthenticatedUser(): string | null {
        if (!authEnabled) return config.authUser || "administrator";
        const authHeader = req.headers.get("authorization");
        let token = "";
        if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
          token = authHeader.slice(7).trim();
        } else {
          const cookies = parseCookies(req.headers.get("cookie"));
          token = cookies.auth_token || "";
        }
        if (!token) return null;
        const verified = verifyAuthToken(token, config.authSecret);
        return verified ? verified.user : null;
      }

      // Endpoints de Autenticação
      if (url.pathname === "/api/auth/me") {
        const user = getAuthenticatedUser();
        return Response.json({
          authenticated: !!user,
          user: user || null,
          authEnabled,
        });
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        try {
          const body = (await req.json()) as { username?: string; password?: string };
          const cleanUser = (body.username || "").trim().toLowerCase();
          const expectedUser = (config.authUser || "administrator").trim().toLowerCase();
          const cleanPass = body.password || "";
          const expectedPass = config.authPassword || "amz@exatas1010";

          if (cleanUser === expectedUser && cleanPass === expectedPass) {
            const token = createAuthToken(cleanUser, config.authSecret);
            const cookieVal = `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;
            return new Response(
              JSON.stringify({ ok: true, user: cleanUser }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Set-Cookie": cookieVal,
                },
              },
            );
          } else {
            return Response.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
          }
        } catch (err: unknown) {
          return Response.json({ error: "Erro ao processar login." }, { status: 400 });
        }
      }

      if (url.pathname === "/api/auth/logout" && method === "POST") {
        return new Response(
          JSON.stringify({ ok: true }),
          {
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
            },
          },
        );
      }

      // Barreira de autenticação para rotas protegidas da API
      if (authEnabled && url.pathname.startsWith("/api/")) {
        const isPublic =
          url.pathname === "/api/status" ||
          url.pathname === "/api/auth/login" ||
          url.pathname === "/api/auth/logout" ||
          url.pathname === "/api/auth/me";

        if (!isPublic) {
          const currentUser = getAuthenticatedUser();
          if (!currentUser) {
            return Response.json(
              { error: "Acesso não autorizado. Faça login para continuar." },
              { status: 401 },
            );
          }
        }
      }

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
          summariesByComp.set(comp, summary);
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

          // Atualizar ou criar summary da competência para permitir exportação Excel imediata
          let compSummary = summariesByComp.get(comp);
          if (!compSummary) {
            compSummary = {
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
            summariesByComp.set(comp, compSummary);
          } else {
            const existingIdx = compSummary.resultados.findIndex(
              (r) => r.empresa.codiEmp === res.empresa.codiEmp,
            );
            if (existingIdx >= 0) {
              compSummary.resultados[existingIdx] = res;
            } else {
              compSummary.resultados.push(res);
            }
            compSummary.totalEmpresas = compSummary.resultados.length;
            compSummary.conformes = compSummary.resultados.filter((r) => r.status === "CONFORME").length;
            compSummary.divergentes = compSummary.resultados.filter((r) => r.status === "DIVERGENTE").length;
            compSummary.pendentes = compSummary.resultados.filter((r) => r.status === "PENDENTE").length;
            compSummary.semDctfweb = compSummary.resultados.filter((r) => r.status === "SEM_DCTFWEB").length;
            compSummary.erros = compSummary.resultados.filter((r) => r.status === "ERRO").length;
            compSummary.chamadasSerproRealizadas = compSummary.resultados.length;
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

      if (url.pathname === "/api/history/company") {
        try {
          const codiEmp = String(url.searchParams.get("codiEmp") || "").trim();
          if (!codiEmp) {
            return Response.json({ error: "codiEmp obrigatório" }, { status: 400 });
          }
          const requestedLimit = Number(url.searchParams.get("limit") || 6);
          const limit = Number.isFinite(requestedLimit) ? requestedLimit : 6;
          return Response.json(storage.getCompanyReconciliationHistory(codiEmp, limit));
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

          const cached = storage.getSitfisResult(cnpj);
          let protocolo = cached?.protocolo || `SITFIS-${cnpj}-${Date.now().toString(36).toUpperCase()}`;
          let tempoEspera = 3000;

          if (!useMock && sitfisService) {
            const protoRes = await sitfisService.solicitarProtocolo(cnpj);
            if (protoRes.protocoloRelatorio) {
              protocolo = protoRes.protocoloRelatorio;
              tempoEspera = protoRes.tempoEspera || 3000;
            } else if (cached?.protocolo) {
              protocolo = cached.protocolo;
              tempoEspera = protoRes.tempoEspera || 3000;
            }
          }

          storage.saveSitfisResult(cnpj, {
            protocolo,
            situacao: "PROCESSANDO",
            mensagens: [{ codigo: "001", texto: "Protocolo de consulta ativo" }],
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
        const cnpj = String(url.searchParams.get("cnpj") || "").replace(/\D/g, "");
        if (!cnpj || cnpj.length !== 14) {
          return new Response("CNPJ inválido.", { status: 400 });
        }
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

      // Emissão de Guia DARF DCTFWeb (suporta tanto /api/guias/darf-dctfweb quanto /api/dctfweb/gerar-guia)
      if ((url.pathname === "/api/guias/darf-dctfweb" || url.pathname === "/api/dctfweb/gerar-guia") && method === "POST") {
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

      // --- Rotas Simples Nacional (PGDAS-D / DEFIS) ---
      if (url.pathname === "/api/simples/declaracoes" && method === "POST") {
        try {
          const body = (await req.json()) as {
            cnpj?: string;
            anoCalendario?: string;
            periodoApuracao?: string;
            forceRefresh?: boolean;
          };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const pa = body.periodoApuracao || "202608";
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          if (!body.forceRefresh) {
            const cached = storage.getSimplesResult(cnpj, pa);
            if (cached && cached.declaracoes && cached.declaracoes.length > 0) {
              return Response.json({
                cnpj,
                periodoApuracao: pa,
                declaracoes: cached.declaracoes,
                dasGerado: cached.dasGerado,
                origem: "CACHE",
              });
            }
          }

          let declaracoes: any[] = [];
          let dasGerado: any = null;

          if (!useMock && simplesService) {
            declaracoes = await simplesService.consultarDeclaracoes(cnpj, {
              anoCalendario: body.anoCalendario,
              periodoApuracao: pa,
            });

            // Se não houver declarações para o PA específico, consulta todo o ano-calendário
            if (declaracoes.length === 0 && !body.anoCalendario) {
              const ano = pa.slice(0, 4);
              const declsAno = await simplesService.consultarDeclaracoes(cnpj, { anoCalendario: ano });
              if (declsAno.length > 0) {
                declaracoes = declsAno;
              }
            }

            // Tenta obter os valores do DAS gerado para enriquecer o retorno imediato
            const declNoPa = declaracoes.find((d) => d.periodoApuracao === pa);
            if (declNoPa) {
              try {
                dasGerado = await simplesService.gerarDas(cnpj, pa);
              } catch {
                // Silencioso se o DAS ainda não estiver liberado para emissão
              }
            }
          } else {
            declaracoes = [
              {
                periodoApuracao: pa,
                tipoOperacao: "Declaração Original",
                numeroDeclaracao: `PGDAS-${pa}-${cnpj.slice(0, 4)}`,
                dataHoraTransmissao: "20260905143000",
                malha: null,
                numeroDas: `07.${pa}.998877`,
                dataHoraEmissaoDas: "20260905143200",
                dasPago: cnpj.endsWith("2") || cnpj.endsWith("8"),
              },
            ];
            dasGerado = {
              numeroDocumento: `07.${pa}.998877`,
              dataVencimento: "20260920",
              valorTotal: 1850.50,
              valorPrincipal: 1850.50,
              valorMulta: 0,
              valorJuros: 0,
            };
          }

          storage.saveSimplesResult(cnpj, pa, { declaracoes, dasGerado });
          return Response.json({ cnpj, periodoApuracao: pa, declaracoes, dasGerado, origem: "LIVE" });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/simples/declaracao-pdf" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; periodoApuracao?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const pa = body.periodoApuracao || "202608";
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          let result: any = {
            numeroDeclaracao: `PGDAS-${pa}-${cnpj.slice(0, 4)}`,
            declaracaoPdfBase64: MINIMAL_MOCK_PDF_BASE64,
            reciboPdfBase64: MINIMAL_MOCK_PDF_BASE64,
          };
          if (!useMock && simplesService) {
            result = await simplesService.consultarUltimaDeclaracaoRecibo(cnpj, pa);
          }

          return Response.json({ cnpj, periodoApuracao: pa, ...result });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/simples/gerar-das" && method === "POST") {
        try {
          const body = (await req.json()) as {
            cnpj?: string;
            periodoApuracao?: string;
            dataConsolidacao?: string;
          };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const pa = body.periodoApuracao || "202608";
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          let result: any = null;
          if (!useMock && simplesService) {
            result = await simplesService.gerarDas(cnpj, pa, body.dataConsolidacao);
          } else {
            result = {
              pdfBase64: MINIMAL_MOCK_PDF_BASE64,
              numeroDocumento: `07.${pa}.998877`,
              dataVencimento: "20260920",
              valorTotal: 1850.50,
              valorPrincipal: 1850.50,
              valorMulta: 0,
              valorJuros: 0,
              composicao: [
                { codigo: "1001", denominacao: "CPP / Previdenciário SN", valor: 850.50 },
                { codigo: "1002", denominacao: "IRPJ - Simples Nacional", valor: 250.00 },
                { codigo: "1003", denominacao: "CSLL - Simples Nacional", valor: 150.00 },
                { codigo: "1004", denominacao: "PIS - Simples Nacional", valor: 100.00 },
                { codigo: "1005", denominacao: "COFINS - Simples Nacional", valor: 500.00 },
              ],
            };
          }

          storage.saveSimplesResult(cnpj, pa, { dasGerado: result });
          return Response.json({ cnpj, periodoApuracao: pa, ...result });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/simples/extrato-das" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; numeroDas?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const numDas = String(body.numeroDas || "").trim();
          if (!cnpj || !numDas) return Response.json({ error: "CNPJ e Número do DAS obrigatórios" }, { status: 400 });

          let result: any = { pdfBase64: MINIMAL_MOCK_PDF_BASE64, nomeArquivo: `extrato-das-${numDas}.pdf` };
          if (!useMock && simplesService) {
            result = await simplesService.consultarExtratoDas(cnpj, numDas);
          }

          return Response.json({ cnpj, numeroDas: numDas, ...result });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/simples/defis" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; forceRefresh?: boolean };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          const pa = "2026";
          if (!body.forceRefresh) {
            const cached = storage.getSimplesResult(cnpj, pa);
            if (cached && cached.defis && cached.defis.length > 0) {
              return Response.json({ cnpj, defis: cached.defis, origem: "CACHE" });
            }
          }

          let defisList: any[] = [];
          if (!useMock && simplesService) {
            defisList = await simplesService.consultarDefis(cnpj);
          } else {
            defisList = [
              {
                anoCalendario: 2025,
                idDefis: `DEFIS-2025-${cnpj.slice(0, 4)}`,
                tipo: "1-Original Normal",
                dataHora: "20260325114500",
              },
            ];
          }

          storage.saveSimplesResult(cnpj, pa, { defis: defisList });
          return Response.json({ cnpj, defis: defisList, origem: "LIVE" });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/simples/list") {
        try {
          return Response.json(storage.listAllSimplesResults());
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // --- Rotas Parcelamentos Fiscais (PARCSN / PARCMEI) ---
      if (url.pathname === "/api/parcelamentos/pedidos" && method === "POST") {
        try {
          const body = (await req.json()) as {
            cnpj?: string;
            modalidade?: "PARCSN" | "PARCMEI";
            forceRefresh?: boolean;
          };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const mod = body.modalidade || "PARCSN";
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          if (!body.forceRefresh) {
            const cached = storage.getParcelamentoResult(cnpj, mod);
            if (cached && cached.pedidos && cached.pedidos.length > 0) {
              return Response.json({ cnpj, modalidade: mod, pedidos: cached.pedidos, origem: "CACHE" });
            }
          }

          let pedidos: any[] = [];
          if (!useMock && parcelamentoService) {
            pedidos = await parcelamentoService.consultarPedidos(cnpj, mod);
          } else {
            pedidos = [
              {
                numero: `PARC-${mod}-${cnpj.slice(0, 4)}-01`,
                modalidade: mod,
                dataDoPedido: "20251110",
                situacao: "Em Cobrança / Ativo",
                dataDaSituacao: "20251110",
              },
            ];
          }

          storage.saveParcelamentoResult(cnpj, mod, { pedidos });
          return Response.json({ cnpj, modalidade: mod, pedidos, origem: "LIVE" });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/parcelamentos/parcelas" && method === "POST") {
        try {
          const body = (await req.json()) as {
            cnpj?: string;
            modalidade?: "PARCSN" | "PARCMEI";
            forceRefresh?: boolean;
          };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const mod = body.modalidade || "PARCSN";
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          if (!body.forceRefresh) {
            const cached = storage.getParcelamentoResult(cnpj, mod);
            if (cached && cached.parcelas && cached.parcelas.length > 0) {
              return Response.json({ cnpj, modalidade: mod, parcelas: cached.parcelas, origem: "CACHE" });
            }
          }

          let parcelas: any[] = [];
          if (!useMock && parcelamentoService) {
            parcelas = await parcelamentoService.consultarParcelas(cnpj, mod);
          } else {
            parcelas = [
              { parcela: "202609", valor: 450.00 },
              { parcela: "202610", valor: 450.00 },
            ];
          }

          storage.saveParcelamentoResult(cnpj, mod, { parcelas });
          return Response.json({ cnpj, modalidade: mod, parcelas, origem: "LIVE" });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/parcelamentos/gerar-das" && method === "POST") {
        try {
          const body = (await req.json()) as {
            cnpj?: string;
            parcela?: string;
            modalidade?: "PARCSN" | "PARCMEI";
          };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const parcela = body.parcela || "202609";
          const mod = body.modalidade || "PARCSN";
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          let pdfBase64 = MINIMAL_MOCK_PDF_BASE64;
          if (!useMock && parcelamentoService) {
            const res = await parcelamentoService.gerarDasParcela(cnpj, parcela, mod);
            if (res.pdfBase64) pdfBase64 = res.pdfBase64;
          }

          return Response.json({ cnpj, parcela, modalidade: mod, pdfBase64 });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/parcelamentos/list") {
        try {
          return Response.json(storage.listAllParcelamentos());
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // --- Parcelamentos PGFN (Dívida Ativa da União) ---
      if (url.pathname === "/api/parcelamentos-pgfn" && method === "GET") {
        try {
          const cnpj = url.searchParams.get("cnpj") || undefined;
          return Response.json(storage.listParcelamentosPgfn(cnpj));
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/parcelamentos-pgfn" && method === "POST") {
        try {
          const body = (await req.json()) as any;
          if (!body.cnpj || !body.numero_negociacao || !body.modalidade) {
            return Response.json({ error: "CNPJ, Número da Negociação e Modalidade são obrigatórios" }, { status: 400 });
          }
          if (body.dia_vencimento !== undefined && body.dia_vencimento !== null) {
            const diaVenc = Number(body.dia_vencimento);
            if (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
              return Response.json({ error: "O dia de vencimento deve estar entre 1 e 31." }, { status: 400 });
            }
          }
          const id = storage.saveParcelamentoPgfn(body);
          const saved = storage.getParcelamentoPgfn(id);
          return Response.json(saved);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname.startsWith("/api/parcelamentos-pgfn/") && method === "DELETE") {
        try {
          const parts = url.pathname.split("/");
          const id = parseInt(parts[3] || "0", 10);
          if (!id) return Response.json({ error: "ID inválido" }, { status: 400 });
          const ok = storage.deleteParcelamentoPgfn(id);
          return Response.json({ success: ok });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname.startsWith("/api/parcelamentos-pgfn/") && url.pathname.endsWith("/auditar") && method === "POST") {
        try {
          const parts = url.pathname.split("/");
          const id = parseInt(parts[3] || "0", 10);
          const record = storage.getParcelamentoPgfn(id);
          if (!record) return Response.json({ error: "Acordo PGFN não encontrado" }, { status: 404 });

          // 1. Auditoria bancária via Pagamentos Arrecadados SERPRO
          let status = "EM_DIA";
          let detalhes = "Auditoria realizada com sucesso.";
          let achouPagamento = false;

          const hoje = new Date();
          const d60 = new Date(Date.now() - 60 * 86400000);
          const dataFim = hoje.toISOString().slice(0, 10).replace(/-/g, "");
          const dataInicio = d60.toISOString().slice(0, 10).replace(/-/g, "");

          let pagamentos: any[] = [];
          if (!useMock && pagamentoService) {
            try {
              const resPag = await pagamentoService.consultarPagamentos(record.cnpj, {
                dataInicial: dataInicio,
                dataFinal: dataFim,
              });
              pagamentos = Array.isArray(resPag) ? resPag : [];
            } catch {
              pagamentos = [];
            }
          } else {
            if (record.cnpj.slice(-1).match(/[246]/)) {
              pagamentos = [{
                receita: record.codigo_receita || "1734",
                dataArrecadacao: hoje.toISOString().slice(0, 10),
                valorTotal: record.valor_parcela || 350.00,
              }];
            }
          }

          const codigosPgfn = [record.codigo_receita || "1734", "1734", "4270", "5029", "5035"];
          const pagPgfn = pagamentos.find((p: any) => {
            const recCode = String(p.receitaPrincipalCodigo || p.codigoReceita || p.receita || "");
            const matchReceita = recCode ? codigosPgfn.some((c) => recCode.includes(c) || c.includes(recCode)) : false;
            const matchValor = p.valorTotal && Math.abs(Number(p.valorTotal) - Number(record.valor_parcela || 0)) < 1.0;
            return matchReceita || matchValor;
          });

          if (pagPgfn) {
            achouPagamento = true;
            status = "PAGO_NO_MES";
            detalhes = `Pagamento localizado na rede bancária em ${pagPgfn.dataArrecadacao} no valor de R$ ${Number(pagPgfn.valorTotal || record.valor_parcela).toFixed(2)}.`;
          }

          // 2. Se não achou pagamento, verificar situação fiscal se há pendência na PGFN
          if (!achouPagamento) {
            let temPendenciaPgfn = false;

            if (!useMock && sitfisService) {
              try {
                let sitCache = storage.getSitfisResult(record.cnpj);
                let situacao = sitCache?.situacao;

                if (!situacao || situacao === "PROCESSANDO") {
                  const resSit = await sitfisService.solicitarProtocolo(record.cnpj);
                  if (resSit.protocoloRelatorio) {
                    const waitTime = Math.min(Math.max((resSit.tempoEspera || 2) * 1000, 1000), 5000);
                    await new Promise((r) => setTimeout(r, waitTime));
                    const rel = await sitfisService.obterRelatorio(record.cnpj, resSit.protocoloRelatorio);
                    situacao = rel.situacaoGeral || (rel.status === 200 ? "REGULAR" : "PROCESSANDO");
                    storage.saveSitfisResult(record.cnpj, {
                      protocolo: resSit.protocoloRelatorio,
                      situacao,
                      pdfBase64: rel.pdfBase64,
                      mensagens: rel.mensagens,
                    });
                  }
                }

                if (situacao === "PENDENTE" || situacao === "COM_PENDENCIAS") {
                  temPendenciaPgfn = true;
                }
              } catch (e) {
                console.error(`Erro ao consultar situação fiscal PGFN para ${record.cnpj}:`, e);
              }
            } else {
              if (record.cnpj.slice(-1).match(/[08]/)) {
                temPendenciaPgfn = true;
              }
            }

            const diaHoje = hoje.getDate();
            if (temPendenciaPgfn) {
              status = "RISCO_RESCISAO";
              detalhes = "Pendências detectadas no âmbito da PGFN/Dívida Ativa com risco de rescisão do acordo.";
            } else if (diaHoje > (record.dia_vencimento || 30)) {
              status = "PENDENTE";
              detalhes = `Parcela vencida no dia ${record.dia_vencimento} sem confirmação de arrecadação bancária.`;
            } else {
              status = "EM_DIA";
              detalhes = `Aguardando vencimento em ${record.dia_vencimento}/${hoje.getMonth() + 1}. Sem pendências impeditivas na PGFN.`;
            }
          }

          storage.updateParcelamentoPgfnAuditoria(id, status, detalhes);
          const updated = storage.getParcelamentoPgfn(id);
          return Response.json(updated);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // --- Procurações RFB & Vínculos ---
      if (url.pathname === "/api/procuracoes/lista") {
        try {
          return Response.json(storage.listAllProcuracoes());
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/procuracoes/consultar" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; tipo?: "1" | "2"; forceRefresh?: boolean };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          if (!body.forceRefresh) {
            const cached = storage.getProcuracao(cnpj);
            if (cached) {
              return Response.json({ ...cached, origem: "CACHE" });
            }
          }

          let res: any;
          if (!useMock && procuracaoService) {
            res = await procuracaoService.obterProcuracao(cnpj, body.tipo || "2");
          } else {
            const diasRestantes = cnpj.endsWith("0") ? -5 : (cnpj.endsWith("1") ? 22 : (cnpj.endsWith("2") ? 45 : 180));
            const situacao = diasRestantes <= 0 ? "EXPIRADA" : (diasRestantes <= 30 ? "CRITICA" : (diasRestantes <= 60 ? "ALERTA" : "VIGENTE"));
            const expDate = new Date(Date.now() + diasRestantes * 86400000);
            const dtexpiracao = expDate.toISOString().slice(0, 10).replace(/-/g, "");
            const expFormatada = `${String(expDate.getDate()).padStart(2, "0")}/${String(expDate.getMonth() + 1).padStart(2, "0")}/${expDate.getFullYear()}`;
            res = {
              cnpj,
              outorgado: config.serproContratanteCnpj || "11222333000199",
              statusGeral: situacao,
              menorDiasRestantes: diasRestantes,
              dataExpiracaoMaisProxima: expFormatada,
              dataConsulta: new Date().toISOString(),
              totalSistemas: 4,
              procuracoes: [
                {
                  dtexpiracao,
                  dataExpiracaoFormatada: expFormatada,
                  diasRestantes,
                  situacao,
                  nrsistemas: 4,
                  sistemas: ["Caixa Postal - Mensagens", "DCTFWeb", "Situação Fiscal", "Simples Nacional"],
                },
              ],
            };
          }

          storage.saveProcuracao(res);
          return Response.json({ ...res, origem: "LIVE" });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/procuracoes/vinculos-contador") {
        try {
          if (!useMock && procuracaoService) {
            const res = await procuracaoService.consultarVinculosContador();
            return Response.json(res);
          } else {
            return Response.json({
              totalInThePage: 2,
              totalInTheDatabase: 2,
              cnpjs: [
                {
                  cnpj: "12345678000195",
                  tipoEstabelecimento: "MATRIZ",
                  situacaoCadastral: { uf: "SP", nomeMunicipio: "FRANCA", descricao: "ATIVA" },
                },
                {
                  cnpj: "98765432000100",
                  tipoEstabelecimento: "MATRIZ",
                  situacaoCadastral: { uf: "SP", nomeMunicipio: "FRANCA", descricao: "ATIVA" },
                },
              ],
            });
          }
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // --- Worker Noturno / Varredura Automática ---
      if (url.pathname === "/api/worker/run" && method === "POST") {
        try {
          if (nightlyWorker.getStatus().isRunning) {
            return Response.json(
              { error: "Uma varredura em segundo plano já está em execução." },
              { status: 409 },
            );
          }
          const body = (await req.json().catch(() => ({}))) as { limit?: number };
          const limit = typeof body.limit === "number" ? body.limit : undefined;

          nightlyWorker.run(limit).catch((err) => {
            console.error("[NightlyWorker] Erro na execução:", err);
          });

          return Response.json({
            message: "Varredura iniciada em segundo plano.",
            status: nightlyWorker.getStatus(),
          });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/worker/status") {
        try {
          return Response.json({
            current: nightlyWorker.getStatus(),
            latest: storage.getLatestWorkerHistorico(),
          });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/worker/historico") {
        try {
          const limit = Number(url.searchParams.get("limit")) || 20;
          return Response.json(storage.listWorkerHistorico(limit));
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // --- Módulo MEI Expresso ---
      if (url.pathname === "/api/mei/ccmei" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          if (!useMock && meiService) {
            const res = await meiService.emitirCCMEI(cnpj);
            if (!res.pdfBase64) {
              return Response.json({ error: "CCMEI não localizado ou empresa não ativa como MEI" }, { status: 404 });
            }
            return Response.json({ cnpj, pdfBase64: res.pdfBase64 });
          }
          return Response.json({ cnpj, pdfBase64: MINIMAL_MOCK_PDF_BASE64 });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/mei/das" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; periodoApuracao?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          const pa = body.periodoApuracao || new Date().toISOString().slice(0, 7).replace("-", "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          let res: any;
          if (!useMock && meiService) {
            res = await meiService.gerarDasMei(cnpj, pa);
          } else {
            res = {
              cnpj,
              periodoApuracao: pa,
              pdfBase64: MINIMAL_MOCK_PDF_BASE64,
              numeroDocumento: `DASMEI-${cnpj.slice(0, 4)}-${pa}`,
              valorTotal: 75.60,
              valorPrincipal: 75.60,
              dataVencimento: "20261020",
            };
          }
          return Response.json(res);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/mei/divida-ativa" && method === "POST") {
        try {
          const body = (await req.json()) as { cnpj?: string; anoCalendario?: string };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });

          let debitos: any[] = [];
          if (!useMock && meiService) {
            debitos = await meiService.consultarDividaAtiva(cnpj, body.anoCalendario);
          } else {
            debitos = [];
          }
          return Response.json({ cnpj, debitos });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // --- Módulo Sicalc DARF ---
      if (url.pathname === "/api/sicalc/gerar-darf" && method === "POST") {
        try {
          const body = (await req.json()) as {
            cnpj?: string;
            codigoReceita?: string | number;
            codigoReceitaExtensao?: string | number;
            uf?: string;
            municipio?: string | number;
            dataPA?: string;
            valorImposto?: number | string;
            vencimento?: string;
            dataConsolidacao?: string;
            cota?: string | number;
            observacao?: string;
          };
          const cnpj = String(body.cnpj || "").replace(/\D/g, "");
          if (!cnpj) return Response.json({ error: "CNPJ obrigatório" }, { status: 400 });
          if (!body.codigoReceita || !body.dataPA || !body.valorImposto) {
            return Response.json({ error: "codigoReceita, dataPA e valorImposto são obrigatórios" }, { status: 400 });
          }

          let res: any;
          if (!useMock && sicalcService) {
            res = await sicalcService.consolidarGerarDarf(cnpj, {
              uf: body.uf || "SP",
              municipio: body.municipio || "7107",
              codigoReceita: body.codigoReceita,
              codigoReceitaExtensao: body.codigoReceitaExtensao || "01",
              dataPA: body.dataPA,
              valorImposto: Number(body.valorImposto),
              vencimento: body.vencimento,
              dataConsolidacao: body.dataConsolidacao,
              cota: body.cota,
              observacao: body.observacao,
            });
          } else {
            const imp = Number(body.valorImposto) || 100;
            res = {
              pdfBase64: MINIMAL_MOCK_PDF_BASE64,
              numeroDocumento: `DARF-SICALC-${cnpj.slice(0, 4)}-${Date.now().toString().slice(-6)}`,
              valorPrincipal: imp,
              valorMulta: 0,
              valorJuros: 0,
              valorTotal: imp,
              consolidado: {
                valorPrincipalMoedaCorrente: imp,
                valorTotalConsolidado: imp,
                valorMultaMora: 0,
                valorJuros: 0,
                dataArrecadacaoConsolidacao: new Date().toISOString(),
              },
            };
          }
          return Response.json(res);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      // --- Dossiê Obsidian & Kit Mensal ---
      if (url.pathname.startsWith("/api/obsidian/dossie/")) {
        try {
          const cnpj = url.pathname.replace("/api/obsidian/dossie/", "").replace(/\D/g, "");
          const companies = await orchestrator.listCompanies();
          const empresa = companies.find((c) => c.cnpj.replace(/\D/g, "") === cnpj);

          const dossieData = await obsidianSync.compilarDossieData(cnpj, empresa);
          const markdown = obsidianSync.gerarMarkdownDossie(dossieData);

          return Response.json({
            cnpj,
            razaoSocial: dossieData.razaoSocial,
            filename: `Dossie-Fiscal-${cnpj}.md`,
            data: dossieData,
            markdown,
          });
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname.startsWith("/api/empresas/") && url.pathname.includes("/kit-mensal/")) {
        try {
          const parts = url.pathname.split("/");
          const cnpj = parts[3]?.replace(/\D/g, "") || "";
          const competencia = parts[5] || "2026-09";

          const companies = await orchestrator.listCompanies();
          const emp = companies.find((c) => c.cnpj.replace(/\D/g, "") === cnpj);
          const cleanPA = competencia.replace("-", "");

          const kit: {
            cnpj: string;
            razaoSocial: string;
            competencia: string;
            guias: Array<{
              tipo: string;
              sigla: string;
              descricao: string;
              gerarUrl: string;
              payload: Record<string, any>;
            }>;
            situacaoGeral: {
              procuracao: string;
              sitfis: string;
              novasMensagens: boolean;
            };
          } = {
            cnpj,
            razaoSocial: emp?.razaoSocial || `Empresa ${cnpj}`,
            competencia,
            guias: [
              {
                tipo: "DARF Previdenciário (DCTFWeb)",
                sigla: "DARF",
                descricao: `Guia Unificada DCTFWeb competência ${competencia}`,
                gerarUrl: `/api/guias/darf-dctfweb`,
                payload: { cnpj, competencia, codiEmp: emp?.codiEmp || "1" },
              },
              {
                tipo: "DAS Simples Nacional",
                sigla: "DAS-SN",
                descricao: `Documento de Arrecadação do Simples Nacional PA ${cleanPA}`,
                gerarUrl: `/api/simples/gerar-das`,
                payload: { cnpj, periodoApuracao: cleanPA },
              },
              {
                tipo: "DAS MEI Expresso",
                sigla: "DAS-MEI",
                descricao: `Documento de Arrecadação Simplificada do MEI PA ${cleanPA}`,
                gerarUrl: `/api/mei/das`,
                payload: { cnpj, periodoApuracao: cleanPA },
              },
              {
                tipo: "Parcelamento Fiscal SN",
                sigla: "PARCSN",
                descricao: `Parcela Mensal de Acordo do Simples Nacional`,
                gerarUrl: `/api/parcelamentos/gerar-das`,
                payload: { cnpj, parcela: cleanPA, modalidade: "PARCSN" },
              },
            ],
            situacaoGeral: {
              procuracao: storage.getProcuracao(cnpj)?.situacao || "NÃO CONSULTADA",
              sitfis: storage.getSitfisResult(cnpj)?.situacao || "NÃO CONSULTADA",
              novasMensagens: (storage.getCaixaPostalResult(cnpj)?.indicador_novas || 0) > 0,
            },
          };

          const pgfnAcordos = storage.listParcelamentosPgfn(cnpj);
          for (const p of pgfnAcordos) {
            kit.guias.push({
              tipo: `DARF PGFN (${p.modalidade})`,
              sigla: "DARF-PGFN",
              descricao: `Acordo Nº ${p.numero_negociacao} — Venc. Dia ${p.dia_vencimento} — R$ ${Number(p.valor_parcela).toFixed(2)}`,
              gerarUrl: `/api/sicalc/gerar-darf`,
              payload: {
                cnpj,
                codigoReceita: p.codigo_receita || "1734",
                dataPA: cleanPA,
                valorImposto: p.valor_parcela,
              },
            });
          }

          return Response.json(kit);
        } catch (err: unknown) {
          return Response.json({ error: String(err) }, { status: 500 });
        }
      }

      if (url.pathname === "/api/export/latest" || url.pathname === "/api/export") {
        const comp = url.searchParams.get("competencia") || Array.from(summariesByComp.keys())[0] || "2026-08";
        let targetSummary = summariesByComp.get(comp);

        if (!targetSummary) {
          const persisted = storage.getPersistedResultsByCompetencia(comp);
          if (persisted.length > 0) {
            targetSummary = {
              competencia: comp,
              totalEmpresas: persisted.length,
              conformes: persisted.filter((r) => r.status === "CONFORME").length,
              divergentes: persisted.filter((r) => r.status === "DIVERGENTE").length,
              pendentes: persisted.filter((r) => r.status === "PENDENTE").length,
              semDctfweb: persisted.filter((r) => r.status === "SEM_DCTFWEB").length,
              erros: persisted.filter((r) => r.status === "ERRO").length,
              tempoExecucaoMs: 0,
              chamadasSerproEstimadas: persisted.length,
              chamadasSerproRealizadas: persisted.length,
              resultados: persisted,
            };
          }
        }

        if (!targetSummary) {
          return new Response("Nenhum lote recente disponível para exportação.", { status: 404 });
        }
        try {
          const excelBuffer = await exporter.generateReport(targetSummary);
          return new Response(new Uint8Array(excelBuffer), {
            headers: {
              "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "Content-Disposition": `attachment; filename="conferencia_${targetSummary.competencia.replace("-", "_")}.xlsx"`,
            },
          });
        } catch (err: unknown) {
          console.error("[ExportExcel] Erro ao gerar planilha:", err);
          return Response.json({ error: "Erro ao gerar arquivo Excel." }, { status: 500 });
        }
      }

      // Favicon vetorial oficial sem emojis
      if (url.pathname === "/favicon.ico") {
        const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#2563EB"/><path d="M25 70 L45 42 L62 58 L78 28" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="78" cy="28" r="5" fill="#38BDF8"/></svg>`;
        return new Response(svgIcon, {
          headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
        });
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
