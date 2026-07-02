import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getProjectRoot, resolveFromProject, resolveRuntimePath } from "../project-paths";

export function loadDotenvFromProjectRoot(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require("dotenv") as typeof import("dotenv");
  dotenv.config({ path: path.resolve(getProjectRoot(), ".env") });
}

export function resolveExcelPath(excelPath: string): string | null {
  return resolveFromProject([excelPath]);
}

export function getExcelPathArg(args: string[] = process.argv.slice(2)): string | null {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--excel" || arg === "--planilha") {
      return args[index + 1]?.trim() || null;
    }
    if (arg.startsWith("--excel=")) {
      return arg.slice("--excel=".length).trim() || null;
    }
    if (arg.startsWith("--planilha=")) {
      return arg.slice("--planilha=".length).trim() || null;
    }
    if (!arg.startsWith("-")) {
      return arg.trim() || null;
    }
  }

  return null;
}

export function openExcelFileDialog(): string | null {
  if (process.platform !== "win32") return null;

  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Selecione a planilha de empresas'
$dialog.Filter = 'Planilhas Excel (*.xlsx;*.xlsm;*.xls)|*.xlsx;*.xlsm;*.xls|Todos os arquivos (*.*)|*.*'
$dialog.Multiselect = $false
$dialog.InitialDirectory = '${getProjectRoot().replace(/'/g, "''")}'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dialog.FileName
}
`;

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      encoding: "utf-8",
      windowsHide: false,
    },
  );

  if (result.status !== 0) return null;

  const selectedPath = result.stdout.trim();
  return selectedPath ? path.resolve(selectedPath) : null;
}

interface FindLatestUnecontDirOptions {
  requireEligibleUploadFiles?: boolean;
}

function hasEligibleUploadFiles(dir: string): boolean {
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "_meta") continue;

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile()) {
        const extension = path.extname(entry.name).toLowerCase();
        if (extension === ".pdf" || extension === ".xlsx") return true;
      }
    }
  }

  return false;
}

function findLatestUnecontDir(
  baseDir: string,
  options: FindLatestUnecontDirOptions = {},
): string | null {
  if (!fs.existsSync(baseDir)) return null;

  const latest = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("Unecont_"))
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .find((name) => {
      if (!options.requireEligibleUploadFiles) return true;
      return hasEligibleUploadFiles(path.join(baseDir, name));
    });

  return latest ? path.join(baseDir, latest) : null;
}

export function findLatestDownloadsDir(baseDir?: string): string | null {
  const downloadsBase = baseDir ? path.resolve(baseDir) : resolveRuntimePath("downloads");
  return findLatestUnecontDir(downloadsBase);
}

export function findLatestNormalizedDir(
  baseDir?: string,
  options: FindLatestUnecontDirOptions = {},
): string | null {
  const normalizedBase = baseDir ? path.resolve(baseDir) : resolveRuntimePath("normalized");
  return findLatestUnecontDir(normalizedBase, options);
}
