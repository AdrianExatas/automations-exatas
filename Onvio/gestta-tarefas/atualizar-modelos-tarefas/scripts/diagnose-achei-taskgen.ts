/**
 * Deeper diagnose: compare EXATAS vs ACHEI task-gen, try POST-only, probe endpoints.
 */
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";

const ACHEI = "64d4c7bbf8fefe0007e875c7";
const EXATAS = "60b6797d9fda5800070dbe7c";
const COMPETENCE = { month: 8, year: 2026 };

async function main(): Promise<void> {
  const client = createGesttaClient(getJwt());

  const probes: Array<{ label: string; method: string; url: string; data?: unknown }> = [
    { label: "achei POST-only", method: "POST", url: `/task-gen/admin/customer/${ACHEI}`, data: COMPETENCE },
    { label: "exatas POST-only (dry probe - careful)", method: "POST", url: `/task-gen/admin/customer/${EXATAS}`, data: COMPETENCE },
    { label: "achei GET customer", method: "GET", url: `/admin/customer/${ACHEI}` },
    { label: "achei GET customer tasks page1", method: "GET", url: `/admin/customer/${ACHEI}/task?limit=5&page=1` },
    { label: "achei GET company customer tasks", method: "GET", url: `/admin/company/customer/${ACHEI}/task?limit=5&page=1` },
    { label: "achei DELETE status", method: "DELETE", url: `/task-gen/admin/customer/${ACHEI}`, data: COMPETENCE },
  ];

  for (const p of probes) {
    try {
      const res = await client.request({
        method: p.method,
        url: p.url,
        data: p.data,
        validateStatus: () => true,
        params: p.url.includes("?") ? undefined : undefined,
      });
      const bodyPreview =
        typeof res.data === "string"
          ? res.data.slice(0, 300)
          : JSON.stringify(res.data)?.slice(0, 500);
      console.log(`\n=== ${p.label} ===`);
      console.log(`${p.method} ${p.url} -> ${res.status}`);
      console.log(bodyPreview);
    } catch (e) {
      console.log(`\n=== ${p.label} ERROR ===`);
      console.log(e instanceof Error ? e.message : String(e));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
