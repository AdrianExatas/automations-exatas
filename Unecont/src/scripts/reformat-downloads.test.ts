import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reformatDownloadedReports = vi.fn();
const loadDotenvFromProjectRoot = vi.fn();
const findLatestDownloadsDir = vi.fn();

vi.mock("../reformat-downloads", () => ({
  reformatDownloadedReports,
}));

vi.mock("./cli-helpers", () => ({
  loadDotenvFromProjectRoot,
  findLatestDownloadsDir,
}));

describe("reformat downloads CLI", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    reformatDownloadedReports.mockResolvedValue({
      downloadsDir: "C:/tmp/downloads",
      outputDir: "C:/tmp/normalized/Unecont_2026-03-12_10-00-00",
      summary: {
        total: 2,
        success: 2,
        failed: 0,
      },
      items: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("usa o diretorio informado e chama a API publica de reformatacao", async () => {
    const { main } = await import("./reformat-downloads");
    const exitCode = await main(["C:/tmp/downloads"]);

    expect(exitCode).toBe(0);
    expect(loadDotenvFromProjectRoot).toHaveBeenCalled();
    expect(findLatestDownloadsDir).not.toHaveBeenCalled();
    expect(reformatDownloadedReports).toHaveBeenCalledWith(
      expect.objectContaining({
        downloadsDir: "C:\\tmp\\downloads",
        logger: console,
        modelPath: expect.stringContaining(path.join("templates", "report-layout-example.xlsx")),
        overwrite: true,
        serviceMapPath: expect.stringContaining(path.join("mappings", "service-item-map.xlsx")),
      }),
    );
  });
});
