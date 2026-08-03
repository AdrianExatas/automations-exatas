import test from "node:test";
import assert from "node:assert/strict";
import { SensitiveRedactor } from "../src/http-map.js";

test("SensitiveRedactor removes document ids and auth material", () => {
  const redactor = new SensitiveRedactor([
    "271219858",
    "02610364598",
    "12345678000190",
  ]);

  const redacted = redactor.redactValue({
    url: "https://example.test/api?ie=271219858&cpf=02610364598&cnpj=12345678000190",
    headers: {
      authorization: "Bearer abc.def.ghi",
      cookie: "SESSION=secret",
      accept: "application/json",
    },
    nested: {
      token: "secret-token",
      body: "JWT abc.def.ghi for 02610364598",
    },
  }) as Record<string, unknown>;

  assert.equal(JSON.stringify(redacted).includes("271219858"), false);
  assert.equal(JSON.stringify(redacted).includes("02610364598"), false);
  assert.equal(JSON.stringify(redacted).includes("12345678000190"), false);
  assert.equal(JSON.stringify(redacted).includes("abc.def.ghi"), false);
  assert.equal((redacted.headers as Record<string, string>).accept, "application/json");
});
