import fs from "fs";

export interface RuntimeAuthArtifact {
  gestta: { jwt: string };
  onvio: { udsLongToken: string };
}

export function loadRuntimeAuthArtifact(filePath: string): RuntimeAuthArtifact | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const value = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<RuntimeAuthArtifact>;
  if (!value.gestta?.jwt || !value.onvio?.udsLongToken) throw new Error("O login salvo esta incompleto. Autentique novamente.");
  return value as RuntimeAuthArtifact;
}
