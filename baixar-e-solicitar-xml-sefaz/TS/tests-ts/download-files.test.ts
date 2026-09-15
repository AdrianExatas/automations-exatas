import AdmZip from "adm-zip";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { DownloadInfo } from "../src-ts/types.js";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "sefaz-files-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

async function useTempDownloads() {
  const config = await import("../src-ts/core/config.js");
  config.PATHS.downloadsDir = join(tempDir, "downloads");
  mkdirSync(config.PATHS.downloadsDir, { recursive: true });
}

function createInfo(): DownloadInfo {
  return {
    url: "https://example.test/download.zip",
    nmArquivo: "271701293_AKMA_COMERCIO_DE_GASES_E_EQUIPAMENTOS_HOSPITALARES_L_30042026_30042026_20260501100245",
    situacao: "PRONTO PARA DOWNLOAD",
    tipoDownload: "NFE",
    dtSolicitacao: "01052026100245",
    rowText: "",
  };
}

describe("download files", () => {
  it("nao considera ZIP vazio como valido", async () => {
    await useTempDownloads();
    const { verificarZipValido } = await import("../src-ts/download/files.js");
    const zipPath = join(tempDir, "empty.zip");
    new AdmZip().writeZip(zipPath);

    expect(verificarZipValido(zipPath)).toBe(false);
  });

  it("extrai ZIP ja organizado para a pasta xmls", async () => {
    await useTempDownloads();
    const { extrairZipOrganizadoExistente, organizedZipPath } = await import("../src-ts/download/files.js");
    const info = createInfo();
    const zipPath = organizedZipPath(info);
    mkdirSync(join(zipPath, ".."), { recursive: true });

    const zip = new AdmZip();
    zip.addFile("nota.xml", Buffer.from("<nfeProc><NFe /></nfeProc>", "utf8"));
    zip.writeZip(zipPath);

    expect(extrairZipOrganizadoExistente(info)).toBe(true);
    expect(existsSync(join(tempDir, "downloads", "2026", "05", "AKMA COMERCIO DE GASES E EQUIPAMENTOS HOSPITALARES L", "xmls", "nota.xml"))).toBe(true);
  });

  it("nao considera ZIP existente invalido como ja organizado", async () => {
    await useTempDownloads();
    const { arquivoJaOrganizado, organizedZipPath } = await import("../src-ts/download/files.js");
    const info = createInfo();
    const zipPath = organizedZipPath(info);
    mkdirSync(join(zipPath, ".."), { recursive: true });
    new AdmZip().writeZip(zipPath);

    expect(arquivoJaOrganizado(info)).toBe(false);
  });

  it("substitui ZIP organizado corrompido pelo download novo", async () => {
    await useTempDownloads();
    const { organizeDownloadedZip, organizedZipPath, verificarZipValido } = await import("../src-ts/download/files.js");
    const info = createInfo();
    const zipPath = organizedZipPath(info);
    mkdirSync(join(zipPath, ".."), { recursive: true });
    new AdmZip().writeZip(zipPath);

    const sourceZip = join(tempDir, "novo.zip");
    const zip = new AdmZip();
    zip.addFile("nota.xml", Buffer.from("<nfeProc><NFe /></nfeProc>", "utf8"));
    zip.writeZip(sourceZip);

    expect(organizeDownloadedZip(sourceZip, info, false)).toBe(zipPath);
    expect(verificarZipValido(zipPath)).toBe(true);
  });

  it("remove zips temporarios da raiz de downloads", async () => {
    await useTempDownloads();
    const config = await import("../src-ts/core/config.js");
    const { limparDownloadsTemporarios } = await import("../src-ts/download/files.js");
    const zipPath = join(config.PATHS.downloadsDir, "arquivo.zip");
    const nestedDir = join(config.PATHS.downloadsDir, "2026");
    mkdirSync(nestedDir, { recursive: true });
    const nestedZip = join(nestedDir, "keep.zip");
    new AdmZip().writeZip(zipPath);
    new AdmZip().writeZip(nestedZip);

    limparDownloadsTemporarios();
    expect(existsSync(zipPath)).toBe(false);
    expect(existsSync(nestedZip)).toBe(true);
  });
});
