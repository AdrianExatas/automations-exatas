import fs from "fs";
import path from "path";

const SETTINGS_FILE = "sheet-settings.json";

interface SheetSettings {
  selectedSheetPath?: string;
}

export function getSheetSettingsPath(userDataPath: string): string {
  return path.join(userDataPath, SETTINGS_FILE);
}

export function readSelectedSheetPath(userDataPath: string): string | null {
  const filePath = getSheetSettingsPath(userDataPath);
  if (!fs.existsSync(filePath)) return null;

  try {
    const settings = JSON.parse(fs.readFileSync(filePath, "utf8")) as SheetSettings;
    const selectedSheetPath = settings.selectedSheetPath?.trim();
    return selectedSheetPath || null;
  } catch {
    return null;
  }
}

export function writeSelectedSheetPath(userDataPath: string, selectedSheetPath: string | null): void {
  const filePath = getSheetSettingsPath(userDataPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!selectedSheetPath) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify({ selectedSheetPath }, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
}
