import { spawn } from "node:child_process";
import { join } from "node:path";
import { getStoragePaths } from "../config";

export interface PsResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runPowerShellFile(
  scriptPath: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number },
): Promise<PsResult> {
  return new Promise((resolve, reject) => {
    const quotedArgs = args.map((a) => JSON.stringify(a)).join(", ");
    const bootstrap = [
      "chcp 65001 > $null",
      "$OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false",
      `& ${JSON.stringify(scriptPath)} @(${quotedArgs})`,
    ].join("; ");
    const psArgs = [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      bootstrap,
    ];
    const child = spawn("powershell.exe", psArgs, {
      cwd: options?.cwd,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    const timer =
      options?.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            child.kill();
            reject(new Error(`Timeout PowerShell: ${scriptPath}`));
          }, options.timeoutMs)
        : null;

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

export function geradorScript(name: string): string {
  return join(getStoragePaths().geradorScripts, name);
}

export async function transcribeVideo(input: {
  videoPath: string;
  outputPath: string;
  resultJson: string;
}): Promise<PsResult> {
  return runPowerShellFile(
    geradorScript("transcribe_video.ps1"),
    [
      "-VideoPath",
      input.videoPath,
      "-OutputPath",
      input.outputPath,
      "-ResultJson",
      input.resultJson,
      "-Language",
      "pt",
    ],
    { timeoutMs: 30 * 60_000 },
  );
}

export async function inspectVideo(input: {
  videoPath: string;
  outputJson: string;
  maxFrames?: number;
}): Promise<PsResult> {
  return runPowerShellFile(
    geradorScript("inspect_video.ps1"),
    [
      "-VideoPath",
      input.videoPath,
      "-OutputJson",
      input.outputJson,
      "-MaxFrames",
      String(input.maxFrames ?? 24),
      "-KeepWorkspace",
    ],
    { timeoutMs: 15 * 60_000 },
  );
}

export async function releaseOfficeLocks(): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-Process WINWORD,EXCEL -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
      ],
      { windowsHide: true },
    );
    child.on("close", () => resolve());
    child.on("error", () => resolve());
  });
}

export async function buildDocuments(input: {
  contentJson: string;
  outputDir: string;
}): Promise<PsResult> {
  let last: PsResult = { exitCode: 1, stdout: "", stderr: "não executado" };
  for (let attempt = 1; attempt <= 3; attempt++) {
    await releaseOfficeLocks();
    await new Promise((r) => setTimeout(r, attempt === 1 ? 500 : 2500));
    last = await runPowerShellFile(
      geradorScript("build_documents.ps1"),
      ["-ContentJson", input.contentJson, "-OutputDir", input.outputDir],
      { timeoutMs: 20 * 60_000 },
    );
    await releaseOfficeLocks();
    if (last.exitCode === 0) return last;
    console.warn(
      `[build_documents] tentativa ${attempt}/3 falhou:`,
      (last.stderr || last.stdout).slice(0, 300),
    );
  }
  return last;
}
