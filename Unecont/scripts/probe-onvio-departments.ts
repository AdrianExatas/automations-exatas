import { loadEnvConfig } from "../src/config";
import { readCachedUdsLongTokenForUpload } from "../src/onvio-uds-refresh";
import { loadDotenvFromProjectRoot } from "../src/scripts/cli-helpers";

async function probe(
  method: string,
  path: string,
  token: string,
  base: string,
  cookie: string,
  body?: unknown,
) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      accept: "application/json, text/plain, */*",
      authorization: `UDSLongToken ${token}`,
      referer: "https://onvio.com.br/br-portal-do-cliente/service-requesting/general",
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  console.log(
    JSON.stringify({
      method,
      path,
      status: res.status,
      body: text.slice(0, 900),
    }),
  );
}

async function main() {
  loadDotenvFromProjectRoot();
  const env = loadEnvConfig();
  const token = env.onvioUdsToken.trim() || readCachedUdsLongTokenForUpload();
  const firm = env.onvioFirmCompanyId || "DA26DD8B76C04A7B9A5EE3D029347E4D";
  const base = (env.onvioBaseUrl || "https://onvio.com.br").replace(/\/+$/, "");
  const cookie = env.onvioCookie.trim();
  console.log("token", token.slice(0, 8), "firm", firm);

  const candidates: Array<{ method: string; path: string; body?: unknown }> = [
    { method: "GET", path: `/api/core/v1/companies/${firm}/departments` },
    {
      method: "POST",
      path: `/api/core/v1/companies/${firm}/departments/search`,
      body: {
        filterSearchSort: { orderBy: "name asc", search: "", searchBy: "", filter: "" },
        pagingDataRequest: { pageIndex: 1, itemsPerPage: 100 },
        excludeCount: false,
      },
    },
    { method: "GET", path: `/api/core/v1/companies/${firm}/department-views` },
    {
      method: "POST",
      path: `/api/core/v1/companies/${firm}/department-views/search`,
      body: {
        filterSearchSort: { orderBy: "name asc", search: "", searchBy: "", filter: "" },
        pagingDataRequest: { pageIndex: 1, itemsPerPage: 100 },
      },
    },
    { method: "GET", path: "/api/br-default-department/v1/departments" },
    {
      method: "GET",
      path: `/api/br-default-department/v1/companies/${firm}/departments`,
    },
    {
      method: "GET",
      path: "/api/br-default-department/v1/department-migration/77A5AD063DC1448A9E1BF53D1BDED580/status",
    },
    { method: "GET", path: "/api/service-requesting/v1/departments" },
    {
      method: "GET",
      path: `/api/service-requesting/v1/companies/${firm}/departments`,
    },
    {
      method: "GET",
      path: "/api/service-requesting/v1/tickets?itemsPerPage=5&pageIndex=0&orderBy=createdDate desc",
    },
    {
      method: "GET",
      path: "/api/service-requesting/v1/tickets/generic?itemsPerPage=5&pageIndex=0",
    },
    {
      method: "POST",
      path: "/api/service-requesting/v1/tickets/search",
      body: {
        filterSearchSort: { orderBy: "createdDate desc", search: "", searchBy: "" },
        pagingDataRequest: { pageIndex: 0, itemsPerPage: 10 },
      },
    },
    {
      method: "GET",
      path: "/api/service-requesting/v1/lookups?types=departments",
    },
    {
      method: "GET",
      path: `/api/core/v1/companies/${firm}/employees?itemsPerPage=5`,
    },
    {
      method: "POST",
      path: `/api/core/v1/companies/${firm}/staff/search`,
      body: {
        filterSearchSort: { orderBy: "", search: "", searchBy: "", filter: "" },
        pagingDataRequest: { pageIndex: 1, itemsPerPage: 5 },
      },
    },
  ];

  for (const c of candidates) {
    try {
      await probe(c.method, c.path, token, base, cookie, c.body);
    } catch (error) {
      console.log(JSON.stringify({ path: c.path, error: String(error) }));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
