import path from "node:path";

await Bun.$`bun scripts/build.ts`;

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronBin = process.platform === "win32"
  ? path.join(process.cwd(), "node_modules", ".bin", "electron.exe")
  : path.join(process.cwd(), "node_modules", ".bin", "electron");

const child = Bun.spawn([electronBin, "."], {
  cwd: process.cwd(),
  env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await child.exited;
process.exit(exitCode);
