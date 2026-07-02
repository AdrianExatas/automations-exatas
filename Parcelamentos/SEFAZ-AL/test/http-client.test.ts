import assert from "node:assert/strict";
import test from "node:test";
import { HttpRequestError } from "../src/http-client.js";

test("erro HTTP tipado preserva etapa, status, URL e corpo", () => {
  const error = new HttpRequestError(
    "dar_visualizar",
    "https://contribuinte.sefaz.al.gov.br/parcelamento/sfz-parcelamento-api/api/dar/visualizar",
    406,
    "conteudo recusado",
  );

  assert.equal(error.step, "dar_visualizar");
  assert.equal(error.status, 406);
  assert.equal(error.url.endsWith("/dar/visualizar"), true);
  assert.equal(error.responseBody, "conteudo recusado");
  assert.match(error.message, /POST dar\/visualizar falhou \(406\): conteudo recusado/);
});
