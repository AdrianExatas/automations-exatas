import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { configureBundledPlaywright } from "../src/playwright-runtime";

const previous = process.env.PLAYWRIGHT_BROWSERS_PATH;
afterEach(() => {
  if (previous === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH;
  else process.env.PLAYWRIGHT_BROWSERS_PATH = previous;
});

describe("Chromium empacotado", () => {
  it("configura o recurso do instalador antes de carregar o Playwright", () => {
    expect(configureBundledPlaywright(true, "C:\\Aplicativo\\resources"))
      .toBe(path.join("C:\\Aplicativo\\resources", "ms-playwright"));
    expect(process.env.PLAYWRIGHT_BROWSERS_PATH).toBe(path.join("C:\\Aplicativo\\resources", "ms-playwright"));
  });

  it("preserva a configuracao local durante o desenvolvimento", () => {
    process.env.PLAYWRIGHT_BROWSERS_PATH = "cache-local";
    expect(configureBundledPlaywright(false, "C:\\Aplicativo\\resources")).toBeUndefined();
    expect(process.env.PLAYWRIGHT_BROWSERS_PATH).toBe("cache-local");
  });
});
