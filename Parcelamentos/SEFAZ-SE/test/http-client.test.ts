import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { HttpPortalClient, validatePdfResponse } from "../src/http-client.js";
import type { HttpReplayPlan } from "../src/http-client.js";
import type { InputRow, ParcelMetadata } from "../src/types.js";

test("validatePdfResponse accepts only PDF responses", () => {
  validatePdfResponse(Buffer.from("%PDF-1.4\n"), { "content-type": "application/pdf" });

  assert.throws(
    () => validatePdfResponse(Buffer.from("not pdf"), { "content-type": "application/pdf" }),
    /nao parece ser um arquivo PDF/,
  );

  assert.throws(
    () => validatePdfResponse(Buffer.from("%PDF-1.4\n"), { "content-type": "text/html" }),
    /nao possui cabecalho de PDF/,
  );
});

test("HttpPortalClient downloads replay-plan PDFs through HTTP", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-http-client-"));
  const server = http.createServer((request, response) => {
    if (request.url === "/dae.pdf") {
      response.writeHead(200, {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="DAE.pdf"',
      });
      response.end("%PDF-1.4\nmock");
      return;
    }

    response.writeHead(404);
    response.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const metadata: ParcelMetadata = {
      protocolo: "202501021663",
      vencimento: "16/03/2026",
      valorParcela: "R$ 421,35",
      qtdeParcelas: 7,
      parcelasPagas: 3,
      parcelasAtrasadas: 1,
      situacaoVencimento: "vencida",
      parcelLabel: "04-07",
      criterioRotulo: "fallback",
    };
    const replayPlan: HttpReplayPlan = {
      parcels: [
        {
          metadata,
          pdfRequest: {
            url: `http://127.0.0.1:${address.port}/dae.pdf`,
            filename: "DAE.pdf",
          },
        },
      ],
    };
    const mapDir = path.join(tempDir, "map");
    await fs.mkdir(mapDir, { recursive: true });
    await fs.writeFile(path.join(mapDir, "network-map.json"), JSON.stringify({ replayPlan }), "utf8");

    const row: InputRow = {
      rowNumber: 2,
      codigo: "001",
      empresa: "Empresa Teste",
      cnpj: "12345678000190",
      inscricaoEstadual: "271219858",
      cpf: "02610364598",
      saveDir: "downloads",
    };
    const client = new HttpPortalClient({ cwd: tempDir, mapDir });
    const [result] = await client.processReplayPlan(row);

    assert.equal(result?.status, "sucesso");
    assert.equal(result?.transport, "http");
    assert.equal(result?.protocolo, metadata.protocolo);
    assert.ok(result?.pdfPath);
    assert.equal(path.basename(path.dirname(result.pdfPath)), currentMonthFolder());
    assert.equal((await fs.readFile(result.pdfPath)).subarray(0, 4).toString("latin1"), "%PDF");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("HttpPortalClient reproduces mapped portal endpoints without DOM", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-http-flow-"));
  const seenBodies: unknown[] = [];
  let tokenCalls = 0;
  const debito = {
    nrSequencial: 789,
    dsDebito: "PARCELAMENTO - PROTOCOLO NÂ° 202607000123",
    dtVencimento: "31/07/2026",
    vlPagar: 421.35,
    nrMaxParcelas: 7,
    detalhes: {
      qtdParcelas: 7,
      nrParcelasPagas: 3,
      nrParcelasAtrasadas: 0,
    },
  };

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks).toString("utf8");
    if (rawBody) {
      seenBodies.push(JSON.parse(rawBody));
    }

    const json = (body: unknown) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };

    if (url.pathname === "/corporativo/v1/obterToken") {
      tokenCalls += 1;
      json({ access_token: "token-teste", token_type: "Bearer" });
      return;
    }

    if (url.pathname.endsWith("/pagamentoDebitos/validarIdentificacaoAutorreg")) {
      json({ cdRetorno: 200, dados: {} });
      return;
    }

    if (url.pathname.endsWith("/corp/criptografia/criptografarUsuario")) {
      json({ result: { cdRetorno: 200, dados: { usuarioLogado: "usuario-criptografado" } } });
      return;
    }

    if (url.pathname.endsWith("/src/contribuinte/buscar")) {
      json({
        result: {
          cdRetorno: 200,
          dados: {
            nmPessoa: "Empresa Teste",
            nmSolicitante: "Solicitante Teste",
          },
        },
      });
      return;
    }

    if (url.pathname.endsWith("/sap/parcelamentoItensSessao/gerarNumSessao")) {
      json({ result: { cdRetorno: 200, dados: { nrSessao: 456 } } });
      return;
    }

    if (url.pathname.endsWith("/itensDebitosContribuinte/buscarDebitosParcelamento")) {
      json({ cdRetorno: 200, dados: { conteudo: [debito] } });
      return;
    }

    if (url.pathname.endsWith("/autorregularizacao/gerarPagamentoDebitos")) {
      json({ result: { cdRetorno: 200, dados: [{ nrDAE: 123456 }] } });
      return;
    }

    if (url.pathname.endsWith("/SAE/imprimirDAE")) {
      response.writeHead(200, {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="SAE_DAE_123456.pdf"',
      });
      response.end("%PDF-1.4\nmock");
      return;
    }

    if (url.pathname.includes("/fazendario/v1/src/")) {
      json({ cdRetorno: 200, dados: {} });
      return;
    }

    response.writeHead(404);
    response.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const apiBase = `http://127.0.0.1:${address.port}`;
    const row: InputRow = {
      rowNumber: 2,
      codigo: "001",
      empresa: "Empresa Teste",
      cnpj: "12345678000190",
      inscricaoEstadual: "271219858",
      cpf: "02610364598",
      saveDir: path.join(tempDir, "downloads"),
    };
    const client = new HttpPortalClient({
      cwd: tempDir,
      apiBase,
      tokenUrl: `${apiBase}/corporativo/v1/obterToken?chave=teste`,
    });
    const [result] = await client.processRow(row);

    assert.equal(result?.status, "sucesso");
    assert.equal(result?.transport, "http");
    assert.equal(result?.protocolo, "202607000123");
    assert.equal(result?.vencimento, "31/07/2026");
    assert.equal(result?.valorParcela, "R$ 421,35");
    assert.equal(result?.parcelLabel, "04-07");
    assert.ok(result?.pdfPath);
    assert.equal(path.basename(path.dirname(result.pdfPath)), currentMonthFolder());
    assert.equal((await fs.readFile(result.pdfPath)).subarray(0, 4).toString("latin1"), "%PDF");
    assert.ok(
      seenBodies.some((body) =>
        typeof body === "object"
        && body !== null
        && "detalhes" in body
        && Array.isArray((body as { detalhes?: unknown }).detalhes)
        && (body as { detalhes: Array<{ nrSequencial?: number }> }).detalhes[0]?.nrSequencial === 789,
      ),
    );
    assert.equal(tokenCalls, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

function currentMonthFolder(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
}
