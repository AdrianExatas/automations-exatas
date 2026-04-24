import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import {
  buildInputRowsFromCustomers,
  fetchCustomersForRequests,
  generateInputWorkbook,
  parseRequestsFile,
} from "../src/input-generator.js";

const sampleRequestsFile = `REQUISICAO NORMAL

curl 'https://api.gestta.com.br/admin/company/task/task-normal/customer' \\
  -H 'authorization: JWT antigo' \\
  -H 'if-none-match: W/\"etag-antigo\"' \\
  -H 'accept: application/json'

REQUISICAO SN

curl 'https://api.gestta.com.br/admin/company/task/task-sn/customer' \\
  -H 'authorization: JWT antigo' \\
  -H 'accept: application/json'
`;

test("parseRequestsFile identifies both curl blocks", () => {
  const requests = parseRequestsFile(sampleRequestsFile);

  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.label, "REQUISICAO NORMAL");
  assert.equal(requests[0]?.taskId, "task-normal");
  assert.equal(requests[1]?.taskId, "task-sn");
  assert.deepEqual(requests[0]?.headers, ["authorization: JWT antigo", "accept: application/json"]);
});

test("buildInputRowsFromCustomers formats data and deduplicates by codigo + IE", () => {
  const rows = buildInputRowsFromCustomers(
    [
      [
        {
          customer: {
            code: "001",
            name: "Empresa A",
            cnpj: "12345678000190",
            state_inscription: "001234567",
          },
        },
      ],
      [
        {
          customer: {
            code: "001",
            name: "Empresa A duplicada",
            cnpj: "12345678000190",
            state_inscription: "001234567",
          },
        },
        {
          customer: {
            code: "002",
            name: "Empresa B",
            cnpj: "99888777000166",
            state_inscription: "271219858",
          },
        },
      ],
    ],
    "C:\\Downloads",
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    codigo: "001",
    empresa: "Empresa A",
    cnpj: "12.345.678/0001-90",
    inscricaoEstadual: "001234567",
    cpf: "",
    saveDir: "C:\\Downloads",
  });
  assert.equal(rows[1]?.cnpj, "99.888.777/0001-66");
});

test("fetchCustomersForRequests retries unauthorized requests with refreshed JWT", async () => {
  const [request] = parseRequestsFile(sampleRequestsFile);
  assert.ok(request);

  let attempts = 0;
  let captureCalls = 0;

  const customers = await fetchCustomersForRequests([request], {
    cwd: process.cwd(),
    onvioAuthDir: "C:\\fake-onvio-auth",
    deps: {
      runCurlRequest: (currentRequest) => {
        attempts += 1;

        if (attempts === 1) {
          assert.equal(currentRequest.headers[0], "authorization: JWT antigo");
          return { statusCode: 401, body: "Unauthorized", stderr: "" };
        }

        assert.equal(currentRequest.headers[0], "authorization: JWT jwt-novo");
        return {
          statusCode: 200,
          body: JSON.stringify([{ customer: { code: "001", state_inscription: "271219858" } }]),
          stderr: "",
        };
      },
      captureFreshGesttaJwt: () => {
        captureCalls += 1;
      },
      loadLatestGesttaJwt: () => "jwt-novo",
    },
  });

  assert.equal(captureCalls, 1);
  assert.equal(customers.length, 1);
  assert.equal(customers[0]?.length, 1);
});

test("fetchCustomersForRequests fails with task id when retry remains unauthorized", async () => {
  const [request] = parseRequestsFile(sampleRequestsFile);
  assert.ok(request);

  await assert.rejects(
    () =>
      fetchCustomersForRequests([request], {
        cwd: process.cwd(),
        onvioAuthDir: "C:\\fake-onvio-auth",
        deps: {
          runCurlRequest: () => ({ statusCode: 401, body: "Unauthorized", stderr: "" }),
          captureFreshGesttaJwt: () => undefined,
          loadLatestGesttaJwt: () => "jwt-novo",
        },
      }),
    /task-normal/,
  );
});

test("generateInputWorkbook writes a new workbook based on the template", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sefaz-input-generator-"));
  const requestsPath = path.join(tempDir, "requisicoes.txt");
  const templatePath = path.join(tempDir, "model.xlsx");

  await fs.writeFile(requestsPath, sampleRequestsFile, "utf8");

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["CODIGO", "EMPRESA", "CNPJ", "INSCRICAO ESTADUAL", "CPF", "LOCAL PARA SALVAR ARQUIVO"],
    ["999", "Modelo", "00.000.000/0000-00", "000000000", "", "C:\\Temp"],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Entrada");
  XLSX.writeFile(workbook, templatePath);

  const outputPath = await generateInputWorkbook(
    {
      requestsPath,
      templatePath,
      cwd: tempDir,
      saveDir: "C:\\Downloads",
      onvioAuthDir: path.join(tempDir, "shared", "onvio-auth"),
    },
    {
      runCurlRequest: (request) => {
        if (request.taskId === "task-normal") {
          return {
            statusCode: 200,
            body: JSON.stringify([
              {
                customer: {
                  code: "001",
                  name: "Empresa A",
                  cnpj: "12345678000190",
                  state_inscription: "001234567",
                },
              },
            ]),
            stderr: "",
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify([
            {
              customer: {
                code: "002",
                name: "Empresa B",
                cnpj: "99888777000166",
                state_inscription: "271219858",
              },
            },
          ]),
          stderr: "",
        };
      },
      captureFreshGesttaJwt: () => undefined,
      loadLatestGesttaJwt: () => "jwt-novo",
    },
  );

  const savedWorkbook = XLSX.readFile(outputPath);
  const savedWorksheet = savedWorkbook.Sheets[savedWorkbook.SheetNames[0] ?? "Entrada"];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(savedWorksheet, { defval: "" });

  assert.equal(savedWorkbook.SheetNames[0], "Entrada");
  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0] ?? {}), [
    "CODIGO",
    "EMPRESA",
    "CNPJ",
    "INSCRICAO ESTADUAL",
    "CPF",
    "LOCAL PARA SALVAR ARQUIVO",
  ]);
  assert.equal(rows[0]?.CPF, "");
  assert.equal(rows[0]?.CNPJ, "12.345.678/0001-90");
  assert.equal(rows[1]?.["LOCAL PARA SALVAR ARQUIVO"], "C:\\Downloads");
});
