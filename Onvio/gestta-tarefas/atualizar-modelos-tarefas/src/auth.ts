import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
if (!process.env.JWT_GESTTA && !process.env.GESTTA_JWT_TOKEN) {
  dotenv.config({ path: path.resolve(process.cwd(), "..", "_local", ".env") });
  dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
}

function resolveAuthArtifactPath(startDir = process.cwd()): string {
  const explicit = process.env.ONVIO_AUTH_ARTIFACT_PATH?.trim();
  if (explicit) return path.resolve(startDir, explicit);

  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(
      current,
      "shared",
      "onvio-auth",
      "runtime",
      "latest-auth.json",
    );
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return path.resolve(
    startDir,
    "..",
    "..",
    "shared",
    "onvio-auth",
    "runtime",
    "latest-auth.json",
  );
}

export function getJwt(): string {
  const artifactPath = resolveAuthArtifactPath();
  if (fs.existsSync(artifactPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as {
        gestta?: { jwt?: string };
      };
      const artifactJwt = raw.gestta?.jwt?.trim() || "";
      if (artifactJwt) return artifactJwt;
    } catch {
      // fallback abaixo
    }
  }

  const envJwt =
    process.env.JWT_GESTTA?.trim() || process.env.GESTTA_JWT_TOKEN?.trim() || "";
  if (envJwt) return envJwt;

  throw new Error(
    `JWT Gestta ausente. Gere ${artifactPath} ou defina JWT_GESTTA.`,
  );
}
