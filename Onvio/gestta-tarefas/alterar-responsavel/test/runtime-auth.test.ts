import test from "node:test";
import assert from "node:assert/strict";
import { resolveGesttaRuntimeAuth } from "../src/auth/runtime-auth";

test("prioriza JWT explicito do ambiente local", async () => {
  const auth = await resolveGesttaRuntimeAuth({
    getExplicitEnvJwt: () => "jwt-local",
    resolveArtifactPath: () => "artifact.json",
    loadArtifactJwt: () => "jwt-artefato",
    resolveLegacyEnvPath: () => "legacy.env",
    loadLegacyEnvJwt: () => "jwt-legado",
    refreshArtifactJwt: async () => {
      throw new Error("refresh nao deveria ser chamado");
    },
  });

  assert.equal(auth.mode, "env");
  assert.equal(auth.source, "local-env");
  assert.equal(auth.getJwt(), "jwt-local");
});

test("prioriza artefato sobre JWT legado", async () => {
  let refreshCalls = 0;

  const auth = await resolveGesttaRuntimeAuth({
    getExplicitEnvJwt: () => "",
    resolveArtifactPath: () => "artifact.json",
    loadArtifactJwt: () => "jwt-artefato",
    resolveLegacyEnvPath: () => "legacy.env",
    loadLegacyEnvJwt: () => "jwt-legado",
    refreshArtifactJwt: async () => {
      refreshCalls += 1;
      return "jwt-refresh";
    },
  });

  assert.equal(auth.mode, "artifact");
  assert.equal(auth.source, "artifact");
  assert.equal(auth.getJwt(), "jwt-artefato");
  assert.equal(refreshCalls, 0);
});

test("faz fallback para JWT legado quando artefato esta ausente ou invalido", async () => {
  let refreshCalls = 0;

  const auth = await resolveGesttaRuntimeAuth({
    getExplicitEnvJwt: () => "",
    resolveArtifactPath: () => "artifact.json",
    loadArtifactJwt: () => null,
    resolveLegacyEnvPath: () => "legacy.env",
    loadLegacyEnvJwt: () => "jwt-legado",
    refreshArtifactJwt: async () => {
      refreshCalls += 1;
      throw new Error("sem credenciais para refresh");
    },
  });

  assert.equal(auth.mode, "env");
  assert.equal(auth.source, "legacy-local-env");
  assert.equal(auth.getJwt(), "jwt-legado");
  assert.equal(refreshCalls, 1);
});

test("usa artefato apos refresh quando nao ha JWT explicito nem legado", async () => {
  let refreshCalls = 0;

  const auth = await resolveGesttaRuntimeAuth({
    getExplicitEnvJwt: () => "",
    resolveArtifactPath: () => "artifact.json",
    loadArtifactJwt: () => null,
    resolveLegacyEnvPath: () => "legacy.env",
    loadLegacyEnvJwt: () => null,
    refreshArtifactJwt: async () => {
      refreshCalls += 1;
      return "jwt-refresh";
    },
  });

  assert.equal(auth.mode, "artifact");
  assert.equal(auth.source, "artifact");
  assert.equal(auth.getJwt(), "jwt-refresh");
  assert.equal(refreshCalls, 1);
});

test("auth de artefato passa a retornar JWT novo apos refresh", async () => {
  let refreshCalls = 0;

  const auth = await resolveGesttaRuntimeAuth({
    getExplicitEnvJwt: () => "",
    resolveArtifactPath: () => "artifact.json",
    loadArtifactJwt: () => "jwt-artefato",
    resolveLegacyEnvPath: () => "legacy.env",
    loadLegacyEnvJwt: () => null,
    refreshArtifactJwt: async () => {
      refreshCalls += 1;
      return "jwt-refresh";
    },
  });

  assert.equal(auth.getJwt(), "jwt-artefato");
  await auth.refreshJwt();
  assert.equal(auth.getJwt(), "jwt-refresh");
  assert.equal(refreshCalls, 1);
});

test("modo forcado por artefato ignora JWT explicito e fallback legado", async () => {
  let refreshCalls = 0;

  const auth = await resolveGesttaRuntimeAuth({
    forceArtifact: true,
    getExplicitEnvJwt: () => "jwt-local",
    resolveArtifactPath: () => "artifact.json",
    loadArtifactJwt: () => "jwt-artefato",
    resolveLegacyEnvPath: () => "legacy.env",
    loadLegacyEnvJwt: () => "jwt-legado",
    refreshArtifactJwt: async () => {
      refreshCalls += 1;
      return "jwt-refresh";
    },
  });

  assert.equal(auth.mode, "artifact");
  assert.equal(auth.source, "artifact");
  assert.equal(auth.getJwt(), "jwt-artefato");
  assert.equal(refreshCalls, 0);
});
