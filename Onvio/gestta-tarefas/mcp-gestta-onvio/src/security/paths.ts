import fs from "node:fs";
import path from "node:path";

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertNoReparseTraversal(target: string, stopAt: string): void {
  let current = target;
  while (isWithin(stopAt, current)) {
    if (fs.existsSync(current)) {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) throw new Error(`Caminho simbólico não permitido: ${current}`);
    }
    if (current === stopAt) break;
    current = path.dirname(current);
  }
}

export function resolveAllowedInput(filePath: string, allowedRoots: string[]): string {
  if (allowedRoots.length === 0) {
    throw new Error("MCP_ALLOWED_ROOTS deve ser configurado para ler arquivos locais.");
  }
  const resolved = path.resolve(filePath);
  const root = allowedRoots.find((candidate) => isWithin(candidate, resolved));
  if (!root) throw new Error("Arquivo fora de MCP_ALLOWED_ROOTS.");
  assertNoReparseTraversal(resolved, root);
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new Error("O caminho informado não é um arquivo.");
  return resolved;
}

export function resolveAllowedOutput(fileName: string, outputDir: string): string {
  if (path.isAbsolute(fileName)) throw new Error("Informe somente um nome relativo para download.");
  const resolved = path.resolve(outputDir, fileName);
  if (!isWithin(outputDir, resolved)) throw new Error("Destino fora de MCP_OUTPUT_DIR.");
  assertNoReparseTraversal(path.dirname(resolved), outputDir);
  return resolved;
}
