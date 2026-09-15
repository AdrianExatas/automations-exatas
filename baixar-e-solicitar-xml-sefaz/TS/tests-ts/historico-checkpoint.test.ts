import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

let tempDir: string;

async function useTempPaths() {
  const config = await import("../src-ts/core/config.js");
  config.PATHS.checkpointsDir = join(tempDir, "checkpoints");
  config.PATHS.checkpointsBackupDir = join(tempDir, "checkpoints", "backups");
  config.PATHS.lockDir = join(tempDir, "lock");
  config.PATHS.logsDir = join(tempDir, "logs");
  config.PATHS.downloadsDir = join(tempDir, "downloads");
}

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "sefaz-ts-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("historico consulta", () => {
  it("salva, carrega e calcula dias pendentes", async () => {
    await useTempPaths();
    const historico = await import("../src-ts/consulta/historico.js");

    expect(historico.carregarHistorico().empresas).toEqual({});
    expect(historico.atualizarDataEmpresa("123_NFE_Emitida", new Date(2026, 0, 10), "NFE", "Emitida")).toBe(true);
    expect(historico.obterUltimaDataEmpresa("123_NFE_Emitida")?.toISOString().slice(0, 10)).toBe("2026-01-10");

    const pendentes = historico.calcularDiasPendentes(new Date(2026, 0, 10), new Date(2026, 0, 12));
    expect(pendentes.map((date) => date.toISOString().slice(0, 10))).toEqual(["2026-01-11", "2026-01-12"]);
  });
});

describe("checkpoint download", () => {
  it("salva, carrega e limpa checkpoint compacto", async () => {
    await useTempPaths();
    const config = await import("../src-ts/core/config.js");
    const checkpoint = await import("../src-ts/download/checkpoint.js");

    const arquivos = new Set<string>();
    checkpoint.registrarArquivoBaixado(
      {
        url: "https://example.test/download.zip",
        nmArquivo: "271_EMPRESA_01012026_01012026_01012026000000",
        dtSolicitacao: "02012026090000",
        tipoDownload: "NFE",
      },
      arquivos,
    );

    expect(checkpoint.salvarCheckpoint(3, arquivos, 1, "02012026")).toBe(true);
    const loaded = checkpoint.carregarCheckpoint();
    expect(loaded?.pagina_atual).toBe(3);
    expect(loaded?.total_baixados).toBe(1);
    expect(loaded?.arquivos_baixados.has("https://example.test/download.zip")).toBe(true);
    expect(loaded?.arquivos_baixados.has("02012026090000")).toBe(false);

    mkdirSync(config.PATHS.checkpointsBackupDir, { recursive: true });
    copyFileSync(checkpoint.CHECKPOINT_FILE, join(config.PATHS.checkpointsBackupDir, "download_checkpoint_manual.json"));
    expect(checkpoint.salvarCursorCheckpoint(10, 1, "02012026")).toBe(true);
    writeFileSync(join(config.PATHS.checkpointsDir, "download_cursor_checkpoint.json.123.tmp"), "{}\n", "utf8");

    expect(checkpoint.limparCheckpoint()).toBe(true);
    expect(checkpoint.carregarCheckpoint()).toBeUndefined();
    expect(existsSync(checkpoint.CHECKPOINT_FILE)).toBe(false);
    expect(existsSync(checkpoint.CURSOR_CHECKPOINT_FILE)).toBe(false);
    expect(readdirSync(config.PATHS.checkpointsBackupDir).filter((name) => /^download_checkpoint_.*\.json$/.test(name))).toEqual([]);
    expect(readdirSync(config.PATHS.checkpointsDir).filter((name) => /^download_(?:cursor_)?checkpoint\.json\..*\.tmp$/.test(name))).toEqual([]);
  });

  it("nao trata dtSolicitacao como id unico entre zips irmaos", async () => {
    await useTempPaths();
    const checkpoint = await import("../src-ts/download/checkpoint.js");

    const nfe = {
      url: "https://example.test/nfe.zip",
      nmArquivo: "271_EMPRESA_01012026_01012026_01012026000000",
      dtSolicitacao: "02012026090000",
      tipoDownload: "NFE",
    };
    const nfc = {
      url: "https://example.test/nfc.zip",
      nmArquivo: "272_EMPRESA_01012026_01012026_01012026000000",
      dtSolicitacao: "02012026090000",
      tipoDownload: "NFC",
    };

    const arquivos = new Set<string>();
    checkpoint.registrarArquivoBaixado(nfe, arquivos);

    expect(checkpoint.jaBaixado(nfe, arquivos)).toBe(true);
    expect(checkpoint.jaBaixado(nfc, arquivos)).toBe(false);
    expect(arquivos.has("02012026090000")).toBe(false);

    expect(checkpoint.salvarCheckpoint(1, arquivos, 1)).toBe(true);
    const loaded = checkpoint.carregarCheckpoint();
    expect(checkpoint.jaBaixado(nfe, loaded?.arquivos_baixados ?? new Set())).toBe(true);
    expect(checkpoint.jaBaixado(nfc, loaded?.arquivos_baixados ?? new Set())).toBe(false);
    expect(loaded?.arquivos_baixados.has("02012026090000")).toBe(false);
  });
});
