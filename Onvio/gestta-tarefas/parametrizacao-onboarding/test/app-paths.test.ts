import path from "path";
import { describe, expect, test } from "vitest";
import { resolveDefaultResourcePath, resolveReportsDir } from "../src/electron/app-paths";

describe("electron app paths", () => {
  test("relatorios ficam dentro de documentos do usuario", () => {
    const documentsPath = path.join("C:", "Users", "Operador", "Documents");

    expect(resolveReportsDir(documentsPath)).toBe(
      path.join(documentsPath, "Parametrizacao Onboarding Gestta", "relatorios"),
    );
  });

  test("matriz padrao em dev usa raiz do projeto", () => {
    expect(
      resolveDefaultResourcePath({
        fileName: "matriz.xlsx",
        isPackaged: false,
        processResourcesPath: path.join("C:", "app", "resources"),
        projectRoot: path.join("C:", "repo", "parametrizacao"),
      }),
    ).toBe(path.join("C:", "repo", "parametrizacao", "matriz.xlsx"));
  });

  test("matriz padrao empacotada usa resources externos", () => {
    expect(
      resolveDefaultResourcePath({
        fileName: "matriz.xlsx",
        isPackaged: true,
        processResourcesPath: path.join("C:", "Program Files", "App", "resources"),
        projectRoot: path.join("C:", "repo", "parametrizacao"),
      }),
    ).toBe(path.join("C:", "Program Files", "App", "resources", "resources", "matriz.xlsx"));
  });
});
