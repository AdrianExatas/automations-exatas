import { loadEnvConfig } from "../src/config";
import { readCachedUdsLongTokenForUpload } from "../src/onvio-uds-refresh";
import { loadDotenvFromProjectRoot } from "../src/scripts/cli-helpers";

async function main() {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();
  const token = env.onvioUdsToken.trim() || readCachedUdsLongTokenForUpload();
  const firm = env.onvioFirmCompanyId || "DA26DD8B76C04A7B9A5EE3D029347E4D";
  const base = (env.onvioBaseUrl || "https://onvio.com.br").replace(/\/+$/, "");

  const res = await fetch(`${base}/api/core/v1/companies/${firm}/departments/search`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `UDSLongToken ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      filterSearchSort: { orderBy: "name asc", search: "", searchBy: "", filter: "" },
      pagingDataRequest: { pageIndex: 1, itemsPerPage: 200 },
      excludeCount: false,
    }),
  });
  const data = (await res.json()) as {
    items?: Array<{ id?: string; name?: string; code?: string }>;
    totalItems?: number;
  };
  console.log("status", res.status, "count", data.items?.length, "total", data.totalItems);
  for (const item of data.items ?? []) {
    console.log(`${item.code}\t${item.id}\t${item.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
