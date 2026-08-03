#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./app.js";
import { safeError } from "./security/redact.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 25 * 1024 * 1024 });
  await server.connect(transport);
  console.error("mcp-gestta-onvio pronto em stdio");
}

main().catch((error) => {
  console.error(`Falha ao iniciar mcp-gestta-onvio: ${safeError(error)}`);
  process.exitCode = 1;
});
