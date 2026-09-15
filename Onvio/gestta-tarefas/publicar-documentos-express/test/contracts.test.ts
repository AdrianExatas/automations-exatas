import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const contractsDir = path.resolve(__dirname, "../contracts/v1");

describe("contratos versionados", () => {
  it("marca as cinco capacidades como verificadas", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(contractsDir, "manifest.json"), "utf8"));
    const verified = new Set(manifest.contracts.filter((item: { verified: boolean }) => item.verified)
      .map((item: { capability: string }) => item.capability.split(".")[0]));
    expect(verified).toEqual(new Set(["companyLookup", "taskLookup", "taskCompletion", "portalPublication", "dueDateUpdate"]));
  });

  it("nao versiona credenciais nem identificadores da captura real", () => {
    const files = fs.readdirSync(contractsDir, { recursive: true })
      .filter((name): name is string => typeof name === "string" && name.endsWith(".json"));
    const text = files.map((name) => fs.readFileSync(path.join(contractsDir, name), "utf8")).join("\n");
    for (const forbidden of ["UDSLongToken ", "eyJhbGci", "AUTOMAXCODE", "64.949.483", "cacef85537074c6dbbc136455f97ed4f"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});
