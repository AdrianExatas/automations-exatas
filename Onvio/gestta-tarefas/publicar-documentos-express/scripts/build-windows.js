const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const authEntry = require.resolve("@exatas/onvio-auth");
const playwrightEntry = require.resolve("playwright", { paths: [authEntry] });
const { chromium } = require(playwrightEntry);
const executable = chromium.executablePath();
const browserDirectory = path.resolve(path.dirname(executable), "..");
const browserDirectoryName = path.basename(browserDirectory);
const browserCacheDirectory = path.dirname(browserDirectory);
const headlessShellDirectoryName = browserDirectoryName.replace(/^chromium-/, "chromium_headless_shell-");
const headlessShellDirectory = path.join(browserCacheDirectory, headlessShellDirectoryName);
const projectDirectory = path.resolve(__dirname, "..");
const stagingRoot = path.join(projectDirectory, ".build", "ms-playwright");
const stagedBrowserDirectory = path.join(stagingRoot, browserDirectoryName);

if (!fs.existsSync(executable)) {
  throw new Error(`Chromium do Playwright nao encontrado em ${executable}. Execute npx playwright install chromium antes de gerar o instalador.`);
}
if (!/^chromium-\d+$/.test(browserDirectoryName)) {
  throw new Error(`Diretorio inesperado do Chromium do Playwright: ${browserDirectory}`);
}
if (!fs.existsSync(headlessShellDirectory)) {
  throw new Error(`Chromium headless do Playwright nao encontrado em ${headlessShellDirectory}. Execute npx playwright install chromium antes de gerar o instalador.`);
}

const cli = require.resolve("electron-builder/out/cli/cli.js");
fs.rmSync(stagingRoot, { recursive: true, force: true });
fs.mkdirSync(stagingRoot, { recursive: true });
fs.cpSync(browserDirectory, stagedBrowserDirectory, { recursive: true });
fs.cpSync(headlessShellDirectory, path.join(stagingRoot, headlessShellDirectoryName), { recursive: true });

let result;
try {
  result = spawnSync(process.execPath, [cli, "--win", "nsis", "--x64", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: {
      ...process.env,
    },
  });
} finally {
  fs.rmSync(stagingRoot, { recursive: true, force: true });
}

if (result.error) throw result.error;
process.exit(result.status ?? 1);
