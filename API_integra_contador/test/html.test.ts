import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { examplesFromPage, fieldsFromTables, parsePage } from "../src/html.ts";

const fixture = (name: string) => readFile(resolve(import.meta.dir, "fixtures", name), "utf8");
const root = "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/";

describe("parser da documentação oficial", () => {
  test("extrai identificação, tabelas, exemplo e data", async () => {
    const page = await parsePage(await fixture("service-page.html"), `${root}pt/solucoes/integra-sn/pgdasd/servicos/gerar_das/`, root);
    expect(page.title).toBe("Gerar DAS");
    expect(page.updatedAt).toBe("10 de abril de 2026 14:58:42 UTC");
    expect(fieldsFromTables(page.tables, "request")[0]).toMatchObject({ name: "periodoApuracao", typeRaw: "String (6)", requiredRaw: "SIM" });
    expect(fieldsFromTables(page.tables, "response")[0]).toMatchObject({ name: "pdf", typeRaw: "String" });
    const extracted = examplesFromPage(page);
    expect(extracted.examples[0].validJson).toBe(true);
    expect(extracted.issues).toHaveLength(0);
    expect(page.markdown).toContain("| Campo | Descrição | Tipo | Obrigatório |");
  });

  test("mantém JSON oficial inválido e registra anomalia", async () => {
    const page = await parsePage(await fixture("invalid-example.html"), `${root}pt/exemplo/`, root);
    const extracted = examplesFromPage(page);
    expect(extracted.examples[0].official).toContain("faltouVirgula");
    expect(extracted.examples[0].normalized).toBeNull();
    expect(extracted.issues[0].code).toBe("official-example-invalid-json");
  });
});
