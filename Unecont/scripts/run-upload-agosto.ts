import fs from "node:fs";
import { spawn } from "node:child_process";
import { readCachedUdsLongTokenForUpload } from "../src/onvio-uds-refresh";
import { loadDotenvFromProjectRoot } from "../src/scripts/cli-helpers";

loadDotenvFromProjectRoot();

const codes = fs.readFileSync("runtime/codigos-upload-agosto.txt", "utf8").trim();
if (!codes) {
  console.error("runtime/codigos-upload-agosto.txt vazio");
  process.exit(1);
}

const token = process.env.ONVIO_UDS_TOKEN?.trim() || readCachedUdsLongTokenForUpload();
if (!token) {
  console.error("Sem UDSLongToken para upload");
  process.exit(1);
}

const args = ["src/scripts/upload-onvio.ts", "--codigos", codes];
console.log(`Iniciando upload de ${codes.split(",").length} codigo(s)...`);

const child = spawn("npx", ["tsx", ...args], {
  cwd: process.cwd(),
  env: { ...process.env, ONVIO_UDS_TOKEN: token },
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 1));
