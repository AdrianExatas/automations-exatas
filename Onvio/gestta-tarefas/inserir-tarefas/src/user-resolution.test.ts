import { describe, expect, it } from "vitest";
import { FuncionarioLocal, UsuarioGestta } from "./types";
import {
  criarLookupFuncionariosLocais,
  resolverUsuarioComFallback,
} from "./user-resolution";
import { normalizarNome } from "./utils";

function groupGestta(items: UsuarioGestta[]): Map<string, UsuarioGestta[]> {
  const grouped = new Map<string, UsuarioGestta[]>();

  for (const item of items) {
    const key = normalizarNome(item.name);
    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  }

  return grouped;
}

describe("user-resolution", () => {
  it("prioriza o Gestta quando o nome existe no Gestta e nao na API local", () => {
    const gestta = groupGestta([
      { _id: "user-1", name: "Daniela Carla de Jesus" },
    ]);

    const local = criarLookupFuncionariosLocais([
      { employee_id: "user-2", name: "Alexcia Couto", active: true },
    ]);

    const result = resolverUsuarioComFallback(gestta, local, "Daniela Carla de Jesus");

    expect(result).toEqual({
      userId: "user-1",
      userNome: "Daniela Carla de Jesus",
      origem: "gestta",
    });
  });

  it("usa fallback local quando o Gestta nao encontra o responsavel", () => {
    const gestta = groupGestta([]);
    const localFuncionarios: FuncionarioLocal[] = [
      { employee_id: "local-1", name: "Maria Silva", active: true },
    ];

    const result = resolverUsuarioComFallback(
      gestta,
      criarLookupFuncionariosLocais(localFuncionarios),
      "Maria Silva",
    );

    expect(result).toEqual({
      userId: "local-1",
      userNome: "Maria Silva",
      origem: "local-fallback",
    });
  });

  it("falha quando Gestta e API local retornam IDs diferentes para o mesmo nome", () => {
    const gestta = groupGestta([
      { _id: "gestta-1", name: "Patricia Lima" },
    ]);

    const local = criarLookupFuncionariosLocais([
      { employee_id: "local-1", name: "Patricia Lima", active: true },
    ]);

    expect(() =>
      resolverUsuarioComFallback(gestta, local, "Patricia Lima"),
    ).toThrow(/IDs diferentes entre Gestta/);
  });
});
