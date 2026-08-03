import { describe, expect, test } from "vitest";
import { resolveGesttaRuntimeAuth } from "../src/auth/runtime-auth";

describe("runtime auth", () => {
  test("usa jwt explicito quando artifact nao e forcado", async () => {
    const auth = await resolveGesttaRuntimeAuth({
      getExplicitEnvJwt: () => "ENV-JWT",
      resolveArtifactPath: () => "artifact.json",
      loadArtifactJwt: () => null,
      refreshArtifactJwt: async () => {
        throw new Error("nao deveria renovar");
      },
      loadLegacyEnvJwt: () => null,
    });

    expect(auth.mode).toBe("env");
    expect(auth.source).toBe("local-env");
    expect(auth.getJwt()).toBe("ENV-JWT");
  });

  test("usa artefato quando auth por artefato e forcada", async () => {
    const auth = await resolveGesttaRuntimeAuth({
      forceArtifact: true,
      getExplicitEnvJwt: () => "ENV-JWT",
      resolveArtifactPath: () => "artifact.json",
      loadArtifactJwt: () => "ARTIFACT-JWT",
      refreshArtifactJwt: async () => "REFRESHED-JWT",
      loadLegacyEnvJwt: () => "LEGACY-JWT",
    });

    expect(auth.mode).toBe("artifact");
    expect(auth.source).toBe("artifact");
    expect(auth.getJwt()).toBe("ARTIFACT-JWT");
    await expect(auth.refreshJwt()).resolves.toBe("REFRESHED-JWT");
    expect(auth.getJwt()).toBe("REFRESHED-JWT");
  });

  test("usa fallback legado quando refresh falha e artifact nao e forcado", async () => {
    const auth = await resolveGesttaRuntimeAuth({
      forceArtifact: false,
      getExplicitEnvJwt: () => "",
      resolveArtifactPath: () => "artifact.json",
      loadArtifactJwt: () => null,
      refreshArtifactJwt: async () => {
        throw new Error("refresh bloqueado");
      },
      resolveLegacyEnvPath: () => "legacy.env",
      loadLegacyEnvJwt: () => "LEGACY-JWT",
    });

    expect(auth.mode).toBe("env");
    expect(auth.source).toBe("legacy-local-env");
    expect(auth.getJwt()).toBe("LEGACY-JWT");
  });

  test("propaga erro de refresh quando nao ha fallback", async () => {
    await expect(resolveGesttaRuntimeAuth({
      forceArtifact: true,
      resolveArtifactPath: () => "artifact.json",
      loadArtifactJwt: () => null,
      refreshArtifactJwt: async () => {
        throw new Error("faca login novamente");
      },
      loadLegacyEnvJwt: () => "LEGACY-JWT",
    })).rejects.toThrow("faca login novamente");
  });
});
