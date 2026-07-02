import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const SCRIPT_NAME = "selecionar-planilhas.ps1";

export function selecionarPlanilhasNoExplorer(): string[] | null {
  if (process.platform !== "win32") {
    console.error("O seletor de arquivos esta disponivel apenas no Windows.");
    return null;
  }

  const scriptPath = path.join(__dirname, "..", "scripts", SCRIPT_NAME);
  if (!fs.existsSync(scriptPath)) {
    console.error("Script do dialogo nao encontrado:", scriptPath);
    return null;
  }

  try {
    const out = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { encoding: "utf8", timeout: 120000 }
    );
    const tempPath = (out || "").replace(/^\uFEFF/, "").trim();
    if (!tempPath || !fs.existsSync(tempPath)) return null;

    const content = fs.readFileSync(tempPath, "utf8").trim();
    fs.unlinkSync(tempPath);

    if (!content) return null;
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}
