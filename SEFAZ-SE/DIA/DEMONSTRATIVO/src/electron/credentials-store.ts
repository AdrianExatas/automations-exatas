import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { safeStorage } from "electron";
import type { StoredCredentials } from "./ipc-types";

type CredentialsFile = {
  user: string;
  certPath?: string;
  encryptedCertPassword?: string;
  /** @deprecated legado login/senha SEFAZ */
  encryptedPassword?: string;
};

export async function readCredentials(filePath: string): Promise<StoredCredentials> {
  try {
    const text = await readFile(filePath, "utf8");
    const data = JSON.parse(text) as CredentialsFile;
    const encrypted = data.encryptedCertPassword
      ? Buffer.from(data.encryptedCertPassword, "base64")
      : undefined;
    return {
      user: data.user ?? "",
      certPath: data.certPath ?? "",
      certPassword: encrypted && safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(encrypted)
        : "",
      remembered: true,
    };
  } catch {
    return { user: "", certPath: "", certPassword: "", remembered: false };
  }
}

export async function saveCredentials(
  filePath: string,
  credentials: { user: string; certPath: string; certPassword: string },
): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("A criptografia local do Electron nao esta disponivel neste Windows.");
  }

  const file: CredentialsFile = {
    user: credentials.user.trim(),
    certPath: credentials.certPath.trim(),
    encryptedCertPassword: safeStorage.encryptString(credentials.certPassword).toString("base64"),
  };
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function clearCredentials(filePath: string): Promise<void> {
  await rm(filePath, { force: true }).catch(() => undefined);
}
