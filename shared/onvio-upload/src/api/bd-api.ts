import {
  normalizeCode,
  normalizeForMatch,
} from "../adapters/unecont/upload-onvio-helpers";

interface PaginatedResponse<T> {
  data?: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface BdCompanyRecord {
  onvio_id?: string;
  code?: string | null;
}

export interface BdEmployeeRecord {
  employee_id?: string;
  name?: string;
}

export interface BdDepartmentRecord {
  department_id?: string;
  name?: string;
}

export interface BdLookupData {
  clientIdByCode: Map<string, string>;
  requesterIdByName: Map<string, string>;
  departmentIdByName: Map<string, string>;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function fetchPaginatedResource<T>(
  baseUrl: string,
  resourcePath: string,
  limit = 500,
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;

  while (true) {
    const url = `${normalizeBaseUrl(baseUrl)}${resourcePath}?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar ${resourcePath}: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as PaginatedResponse<T>;
    const data = Array.isArray(body.data) ? body.data : [];
    items.push(...data);

    const total = Number(body.total ?? items.length);
    if (data.length === 0 || offset + data.length >= total) {
      break;
    }
    offset += data.length;
  }

  return items;
}

export async function loadBdLookupData(baseUrl: string): Promise<BdLookupData> {
  const [companies, employees, departments] = await Promise.all([
    fetchPaginatedResource<BdCompanyRecord>(baseUrl, "/companies"),
    fetchPaginatedResource<BdEmployeeRecord>(baseUrl, "/employees"),
    fetchPaginatedResource<BdDepartmentRecord>(baseUrl, "/departments"),
  ]);

  const clientIdByCode = new Map<string, string>();
  for (const company of companies) {
    const code = normalizeCode(company.code ?? "");
    const onvioId = String(company.onvio_id ?? "").trim();
    if (code && onvioId) {
      clientIdByCode.set(code, onvioId);
    }
  }

  const requesterIdByName = new Map<string, string>();
  for (const employee of employees) {
    const name = normalizeForMatch(employee.name ?? "");
    const employeeId = String(employee.employee_id ?? "").trim();
    if (name && employeeId) {
      requesterIdByName.set(name, employeeId);
    }
  }

  const departmentIdByName = new Map<string, string>();
  for (const department of departments) {
    const name = normalizeForMatch(department.name ?? "");
    const departmentId = String(department.department_id ?? "").trim();
    if (name && departmentId) {
      departmentIdByName.set(name, departmentId);
    }
  }

  return {
    clientIdByCode,
    requesterIdByName,
    departmentIdByName,
  };
}
