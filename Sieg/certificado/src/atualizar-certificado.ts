#!/usr/bin/env node
/**
 * CLI: cadastra/atualiza certificado digital na API SIEG.
 * Uso:
 *   npx tsx src/atualizar-certificado.ts <caminho.pfx> [--senha SENHA] [--cnpj CNPJ]
 *   npm run dev -- <caminho.pfx> --senha "xxx"
 *   node dist/atualizar-certificado.js <caminho.pfx> --senha "xxx"
 */
import { createInterface } from "node:readline";
import { SIEG_API_KEY } from "./config.js";
import { SiegCertificadoClient } from "./client.js";

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer ?? "").trim());
    });
  });
}

function parseArgs(): { pfx?: string; senha?: string; cnpj?: string } {
  const args = process.argv.slice(2);
  const out: { pfx?: string; senha?: string; cnpj?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--senha" || args[i] === "-s") {
      out.senha = args[i + 1];
      i++;
    } else if (args[i] === "--cnpj" || args[i] === "-c") {
      out.cnpj = args[i + 1];
      i++;
    } else if (!args[i].startsWith("-") && !out.pfx) {
      out.pfx = args[i];
    }
  }
  return out;
}

async function main(): Promise<number> {
  const { pfx: pfxArg, senha: senhaArg, cnpj } = parseArgs();

  if (!SIEG_API_KEY) {
    console.error("Erro: SIEG_API_KEY não configurada. Configure no arquivo .env");
    return 1;
  }

  let pfx = pfxArg;
  if (!pfx) {
    pfx = await ask("Caminho do arquivo .pfx: ");
  }
  if (!pfx) {
    console.error("Nenhum arquivo informado.");
    return 1;
  }

  let senha = senhaArg;
  if (!senha) {
    senha = await ask("Senha do certificado: ");
  }
  if (!senha) {
    console.error("Senha é obrigatória.");
    return 1;
  }

  try {
    const client = new SiegCertificadoClient();
    const [ok, msg] = await client.cadastrarAtualizarCertificado(pfx, senha, cnpj);
    if (ok) {
      console.log("OK:", msg);
      return 0;
    }
    console.error("Erro:", msg);
    return 1;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Erro:", message);
    return 1;
  }
}

main().then((code) => process.exit(code));
