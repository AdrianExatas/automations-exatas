import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/automation";

test("parseArgs reconhece --sem-checkpoint sem tratar como caminho de planilha", () => {
  const args = parseArgs(["--sem-checkpoint", "entrada.xlsx"]);

  assert.equal(args.ignorarCheckpoint, true);
  assert.equal(args.continuar, false);
  assert.equal(args.planilhaArg, "entrada.xlsx");
});

test("parseArgs permite --sem-checkpoint junto com --continuar", () => {
  const args = parseArgs(["--continuar", "--sem-checkpoint", "entrada.xlsx"]);

  assert.equal(args.ignorarCheckpoint, true);
  assert.equal(args.continuar, true);
  assert.equal(args.planilhaArg, "entrada.xlsx");
});

test("parseArgs reconhece --backup-only sem tratar como caminho de planilha", () => {
  const args = parseArgs(["--backup-only", "entrada.xlsx"]);

  assert.equal(args.backupOnly, true);
  assert.equal(args.planilhaArg, "entrada.xlsx");
});
