import fs from "fs";
import path from "path";

const SETTINGS_FILE = "matrix-settings.json";

export interface MatrixInfo {
  path: string;
  fileName: string;
  isCustom: boolean;
  exists: boolean;
}

interface MatrixSettings {
  customPath?: string;
}

export function getMatrixSettingsPath(userDataPath: string): string {
  return path.join(userDataPath, SETTINGS_FILE);
}

export function readCustomMatrixPath(userDataPath: string): string | null {
  const filePath = getMatrixSettingsPath(userDataPath);
  if (!fs.existsSync(filePath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as MatrixSettings;
    const customPath = data.customPath?.trim();
    return customPath || null;
  } catch {
    return null;
  }
}

export function writeCustomMatrixPath(userDataPath: string, customPath: string | null): void {
  const filePath = getMatrixSettingsPath(userDataPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!customPath) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  const payload: MatrixSettings = { customPath };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export function validateMatrixPath(matrixPath: string): void {
  const ext = path.extname(matrixPath).toLowerCase();
  if (ext !== ".xlsx") {
    throw new Error("Selecione um arquivo Excel (.xlsx).");
  }
  if (!fs.existsSync(matrixPath)) {
    throw new Error(`Planilha nao encontrada: ${matrixPath}`);
  }
}

export function resolveMatrixPath(userDataPath: string, defaultPath: string): string {
  const customPath = readCustomMatrixPath(userDataPath);
  if (customPath && fs.existsSync(customPath)) return customPath;
  return defaultPath;
}

export function getMatrixInfo(userDataPath: string, defaultPath: string): MatrixInfo {
  const customPath = readCustomMatrixPath(userDataPath);
  const customExists = Boolean(customPath && fs.existsSync(customPath));
  const defaultExists = fs.existsSync(defaultPath);
  const resolvedPath = customExists ? customPath! : defaultPath;

  return {
    path: resolvedPath,
    fileName: path.basename(resolvedPath),
    isCustom: customExists,
    exists: customExists ? true : defaultExists,
  };
}
