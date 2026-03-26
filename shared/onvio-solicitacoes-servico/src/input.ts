import { readServiceRequests } from "./domain/service-requests-reader";
import type { BatchInput, ServiceRequestBatchInput, ServiceRequestRow } from "./types";

function cloneServiceRequest(serviceRequest: ServiceRequestRow): ServiceRequestRow {
  return {
    ...serviceRequest,
    arquivos: [...serviceRequest.arquivos],
  };
}

export function loadServiceRequestsFromExcel(excelPath: string): ServiceRequestRow[] {
  return readServiceRequests(excelPath);
}

export function loadEmpresasFromExcel(excelPath: string): ServiceRequestRow[] {
  return loadServiceRequestsFromExcel(excelPath);
}

export function resolveServiceRequestsInput(
  input: ServiceRequestBatchInput | BatchInput,
): ServiceRequestRow[] {
  if ("serviceRequests" in input) {
    return input.serviceRequests.map(cloneServiceRequest);
  }
  if ("empresas" in input) {
    return input.empresas.map(cloneServiceRequest);
  }

  return loadServiceRequestsFromExcel(input.excelPath);
}

export const resolveEmpresasInput = resolveServiceRequestsInput;
