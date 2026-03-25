import path from "node:path";
import { spawn } from "node:child_process";
import { collectLatestNotificationsForAllCompanies } from "./app.js";

function isBunRuntime(): boolean {
  return typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
}

async function runViaNode(): Promise<void> {
  const nodeBinary = process.env.NODE_BINARY ?? "node";
  const tsxCliPath = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.cjs");
  const runnerPath = path.join(process.cwd(), "src", "runner.ts");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(nodeBinary, [tsxCliPath, runnerPath], {
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`O processo Node finalizou com codigo ${code ?? "desconhecido"}.`));
    });
  });
}

async function main(): Promise<void> {
  if (isBunRuntime()) {
    await runViaNode();
    return;
  }

  await collectLatestNotificationsForAllCompanies();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  process.exit();
});
