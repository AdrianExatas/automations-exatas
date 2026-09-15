import { asObject, itemsFrom, OnvioHttpClient, readString, type OnvioHttpOptions } from "./http";
import { normalizeForMatch } from "./normalize";

export interface OnvioDepartment {
  id: string;
  name: string;
}

function mapDepartment(item: unknown): OnvioDepartment | null {
  const object = asObject(item);
  if (!object) return null;
  const id = readString(object, ["id", "departmentId"]);
  const name = readString(object, ["name", "departmentName", "displayAs"]);
  if (!id || !name) return null;
  return { id, name };
}

export function buildDepartmentIdByName(departments: OnvioDepartment[]): Map<string, string> {
  const byName = new Map<string, string>();
  for (const department of departments) {
    const fullKey = normalizeForMatch(department.name);
    if (fullKey) byName.set(fullKey, department.id);
  }
  for (const department of departments) {
    const fullKey = normalizeForMatch(department.name);
    const withoutSetor = fullKey.replace(/^SETOR\s+/, "").trim();
    if (withoutSetor && withoutSetor !== fullKey) {
      byName.set(withoutSetor, department.id);
    }
  }
  return byName;
}

export class OnvioHttpDepartmentsProvider {
  private readonly http: OnvioHttpClient;

  constructor(options: OnvioHttpOptions) {
    this.http = new OnvioHttpClient(options);
  }

  async listDepartments(): Promise<OnvioDepartment[]> {
    const body = await this.http.request(
      `${this.http.baseUrl}/api/core/v1/companies/${this.http.firmCompanyId}/departments/search`,
      {
        method: "POST",
        body: JSON.stringify({
          filterSearchSort: { orderBy: "name asc", search: "", searchBy: "", filter: "" },
          pagingDataRequest: { pageIndex: 1, itemsPerPage: 200 },
          excludeCount: false,
        }),
      },
      "departamentos",
    );

    return itemsFrom(body)
      .map(mapDepartment)
      .filter((item): item is OnvioDepartment => Boolean(item));
  }

  async loadDepartmentIdByName(): Promise<Map<string, string>> {
    return buildDepartmentIdByName(await this.listDepartments());
  }
}
