import { describe, expect, it } from "vitest";
import { matchClientUserBySolicitante, matchClientUserBySolicitantePartial } from "./requester-resolver";

describe("matchClientUserBySolicitante", () => {
  const users = [
    { nome: "Maria Silva", id: "1" },
    { nome: "Joao Souza", id: "2" },
  ];

  it("casa nome exato ignorando acento", () => {
    expect(matchClientUserBySolicitante(users, "MARIA SILVA")?.id).toBe("1");
  });

  it("casa parcial quando so existe um candidato", () => {
    expect(matchClientUserBySolicitantePartial(users, "Maria")?.id).toBe("1");
  });
});
