import {
  readCachedUdsLongTokenForUpload,
  refreshUdsLongTokenForUpload,
} from "../src/onvio-uds-refresh";
import { loadDotenvFromProjectRoot } from "../src/scripts/cli-helpers";

async function check(token: string): Promise<number> {
  const r = await fetch(
    "https://onvio.com.br/api/service-requesting/v1/client-core?itemsPerPage=1&pageIndex=0&search=1&searchBy=code",
    {
      headers: {
        authorization: `UDSLongToken ${token}`,
        accept: "application/json",
      },
    },
  );
  return r.status;
}

async function main() {
  loadDotenvFromProjectRoot();
  let t = readCachedUdsLongTokenForUpload();
  console.log("cached", t ? `${t.slice(0, 8)} len=${t.length}` : "empty");
  if (t) {
    const st = await check(t);
    console.log("cached status", st);
    if (st === 200) return;
  }
  console.log("refreshing via capture-tokens...");
  t = await refreshUdsLongTokenForUpload();
  console.log("new", `${t.slice(0, 8)} len=${t.length}`, "status", await check(t));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
