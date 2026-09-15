import { describe, expect, test } from "vitest";
import { identificarEmpresaGestta, resolverClientePorCnpj } from "../src/customer";
import { ClienteGestta } from "../src/types";

const empresa: ClienteGestta = {
  _id: "empresa-1",
  name: "Empresa Teste LTDA",
  cnpj: "11.222.333/0001-44",
};

describe("resolucao de empresa por CNPJ", () => {
  test("encontra a empresa independentemente da formatacao do CNPJ", () => {
    const encontrada = resolverClientePorCnpj([empresa], "11222333000144");

    expect(identificarEmpresaGestta(encontrada)).toEqual({
      id: "empresa-1",
      name: "Empresa Teste LTDA",
      cnpj: "11222333000144",
    });
  });

  test("falha quando nao existe empresa para o CNPJ", () => {
    expect(() => resolverClientePorCnpj([empresa], "00000000000000"))
      .toThrow("Cliente nao encontrado no Gestta para CNPJ 00000000000000.");
  });

  test("falha quando o CNPJ corresponde a mais de uma empresa", () => {
    expect(() => resolverClientePorCnpj([empresa, { ...empresa, _id: "empresa-2" }], "11.222.333/0001-44"))
      .toThrow("CNPJ 11222333000144 retornou 2 clientes no Gestta.");
  });
});
