import { readEmpresas } from "./domain/empresas-reader";
import type { BatchInput, EmpresaBatchItem } from "./types";

function cloneEmpresa(empresa: EmpresaBatchItem): EmpresaBatchItem {
  return {
    ...empresa,
    arquivos: [...empresa.arquivos],
  };
}

export function loadEmpresasFromExcel(excelPath: string): EmpresaBatchItem[] {
  return readEmpresas(excelPath);
}

export function resolveEmpresasInput(input: BatchInput): EmpresaBatchItem[] {
  if ("empresas" in input) {
    return input.empresas.map(cloneEmpresa);
  }
  return loadEmpresasFromExcel(input.excelPath);
}
