/**
 * Script de diagnóstico de conexões reais (Domínio ODBC e SERPRO Integra Contador)
 */
import { loadConfig, maskCnpj } from "../Dominio/reinf-dctfweb-conferencia/src/config.ts";
import { DominioOdbcClient } from "../Dominio/reinf-dctfweb-conferencia/src/dominio/client.ts";
import { SerproAuthManager } from "../Dominio/reinf-dctfweb-conferencia/src/serpro/auth.ts";

async function main() {
  console.log("=== Diagnóstico de Conexões Reais ===");
  const config = loadConfig();

  console.log("\n[1/2] Testando Conexão com o Banco Domínio (ODBC)...");
  console.log(`- DSN: ${config.dominioOdbcDsn}`);
  console.log(`- Usuário: ${config.dominioUser}`);

  try {
    const dominioClient = new DominioOdbcClient({
      dsn: config.dominioOdbcDsn,
      user: config.dominioUser,
      password: config.dominioPassword,
    });

    const rows = await dominioClient.executeSelect<{ total: number }>(
      "SELECT COUNT(*) AS total FROM bethadba.geempre WHERE cgce_emp IS NOT NULL AND TRIM(cgce_emp) <> ''"
    );

    const total = rows[0]?.total || 0;
    console.log(`✓ DOMÍNIO CONECTADO COM SUCESSO!`);
    console.log(`  Total de empresas ativas com CNPJ cadastradas em bethadba.geempre: ${total}`);
    await dominioClient.close?.();
  } catch (err: unknown) {
    console.error(`✗ FALHA NA CONEXÃO COM O DOMÍNIO:`, err instanceof Error ? err.message : String(err));
  }

  console.log("\n[2/2] Testando Autenticação SERPRO Integra Contador (mTLS + OAuth2)...");
  console.log(`- Consumer Key: ${config.serproConsumerKey.slice(0, 5)}...`);
  console.log(`- Certificado PFX: ${config.serproCertPfxPath}`);
  console.log(`- CNPJ Contratante: ${maskCnpj(config.serproContratanteCnpj)}`);

  try {
    const authManager = new SerproAuthManager({
      consumerKey: config.serproConsumerKey,
      consumerSecret: config.serproConsumerSecret,
      certificatePfxPath: config.serproCertPfxPath,
      certificatePassword: config.serproCertPassword,
    });

    const tokens = await authManager.getTokens(true);
    console.log(`✓ SERPRO AUTENTICADO COM SUCESSO!`);
    console.log(`  Tipo do Token: ${tokens.token_type}`);
    console.log(`  Validade: ${tokens.expires_in} segundos (${Math.round(tokens.expires_in / 60)} minutos)`);
    console.log(`  Access Token obtido: ${tokens.access_token.slice(0, 10)}... (ok)`);
    console.log(`  JWT Token obtido: ${tokens.jwt_token.slice(0, 10)}... (ok)`);
  } catch (err: unknown) {
    console.error(`✗ FALHA NA AUTENTICAÇÃO COM O SERPRO:`, err instanceof Error ? err.message : String(err));
  }

  console.log("\n=== Fim do Diagnóstico ===");
}

main().catch(console.error);
