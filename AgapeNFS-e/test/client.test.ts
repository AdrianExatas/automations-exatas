import { describe, expect, test } from "bun:test";
import { AgapeNfseClient } from "../src/agape";

describe("AgapeNfseClient", () => {
  test("fixa limite operacional em 8 conexoes", () => {
    const client = new AgapeNfseClient();

    expect(client.maxWorkers).toBe(8);
  });

  test("valida login e senha antes de fazer requisicoes", async () => {
    const client = new AgapeNfseClient();

    await expect(
      client.downloadPeriod({
        login: "",
        password: "",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        outputDir: "tmp",
      }),
    ).rejects.toThrow("Login e senha sao obrigatorios.");
  });

  test("bloqueia periodo em anos diferentes", async () => {
    const client = new AgapeNfseClient();

    await expect(
      client.downloadPeriod({
        login: "login",
        password: "senha",
        startDate: "2025-12-31",
        endDate: "2026-01-01",
        outputDir: "tmp",
      }),
    ).rejects.toThrow("mesmo exercicio/ano");
  });
});
