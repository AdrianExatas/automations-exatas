import assert from "node:assert/strict";
import test from "node:test";
import { HttpRequestError } from "../src/http-client.js";
import {
  buildBrowserFallbackFailureResult,
  shouldUseBrowserFallback,
  withBrowserFallbackDiagnostics,
} from "../src/main-http.js";
import type { InputRow, RunResult } from "../src/types.js";

const row: InputRow = {
  rowNumber: 4,
  empresa: "BONSONO",
  usuario: "24219895",
  senha: "segredo",
};

test("usa fallback via navegador apenas para falhas HTTP de emissao/download", () => {
  assert.equal(
    shouldUseBrowserFallback(new HttpRequestError("parcelamento_emitir", "https://example.test/emitir", 400, "erro")),
    true,
  );
  assert.equal(
    shouldUseBrowserFallback(new HttpRequestError("dar_visualizar", "https://example.test/dar", 406, "")),
    true,
  );
  assert.equal(
    shouldUseBrowserFallback(new HttpRequestError("account", "https://example.test/account", 401, "erro")),
    false,
  );
  assert.equal(shouldUseBrowserFallback(new Error("falha generica")), false);
});

test("resultado recuperado via navegador preserva sucesso e adiciona diagnostico HTTP", () => {
  const recovered: RunResult = withBrowserFallbackDiagnostics(
    {
      rowNumber: 4,
      empresa: "BONSONO",
      usuario: "24219895",
      consolidacao: "11153710",
      status: "sucesso",
      mensagem: "Boleto atual baixado com sucesso para a consolidacao 11153710.",
      mensagemDiagnostico: "tempo_download_ms=100",
      arquivoSalvo: "C:\\saida\\boleto.pdf",
    },
    "POST dar/visualizar falhou (406): ",
  );

  assert.equal(recovered.status, "sucesso");
  assert.match(recovered.mensagem, /Recuperado via navegador apos falha HTTP/);
  assert.equal(recovered.mensagemDiagnostico, "tempo_download_ms=100; falha_http=POST dar/visualizar falhou (406):");
});

test("resultado preserva erro quando HTTP e fallback via navegador falham", () => {
  const failed = buildBrowserFallbackFailureResult(
    row,
    3499404,
    "GET parcelamento emitir falhou (400): Nao foi possivel imprimir a guia",
    "O portal exibiu um alerta ao calcular a parcela.",
  );

  assert.equal(failed.status, "erro");
  assert.equal(failed.consolidacao, "3499404");
  assert.match(failed.mensagem, /HTTP falhou:/);
  assert.match(failed.mensagem, /fallback navegador falhou:/);
  assert.match(failed.mensagemDiagnostico ?? "", /falha_http=/);
  assert.match(failed.mensagemDiagnostico ?? "", /falha_fallback_navegador=/);
});
