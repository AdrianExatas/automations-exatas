import test from "node:test";
import assert from "node:assert/strict";
import {
  deveGerarBackupPreflight,
  deveInterromperAposBackup,
  parseArgs,
} from "../src/automation";

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

test("backup-only gera preflight mesmo sem coluna TAREFA e interrompe o PATCH", () => {
  const linhasSetor = [{ tarefa: undefined }, { tarefa: "" }];

  assert.equal(deveGerarBackupPreflight(true, linhasSetor), true);
  assert.equal(deveGerarBackupPreflight(false, linhasSetor), false);
  assert.equal(deveInterromperAposBackup(true), true);
  assert.equal(deveInterromperAposBackup(false), false);
});

test("planilha com TAREFA continua gerando backup automaticamente sem --backup-only", () => {
  const linhasTarefa = [{ tarefa: "DAS MEI" }];

  assert.equal(deveGerarBackupPreflight(false, linhasTarefa), true);
  assert.equal(deveInterromperAposBackup(false), false);
});
