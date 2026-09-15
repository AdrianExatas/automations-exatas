import fs from "node:fs";
import path from "node:path";
import { safeStorage } from "electron";

export interface StoredCredentials {
  alUsuario?: string;
  alSenha?: string;
  seCpf?: string;
}

function credentialsFilePath(userDataPath: string): string {
  return path.join(userDataPath, "credentials.vault");
}

export function saveCredentials(userDataPath: string, credentials: StoredCredentials): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("O armazenamento seguro de credenciais nao esta disponivel neste Windows.");
  }

  const payload = JSON.stringify(credentials);
  const encrypted = safeStorage.encryptString(payload);
  fs.writeFileSync(credentialsFilePath(userDataPath), encrypted);
}

export function loadCredentials(userDataPath: string): StoredCredentials {
  const filePath = credentialsFilePath(userDataPath);
  if (!fs.existsSync(filePath)) {
    return {};
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return {};
  }

  try {
    const encrypted = fs.readFileSync(filePath);
    const decrypted = safeStorage.decryptString(encrypted);
    return JSON.parse(decrypted) as StoredCredentials;
  } catch {
    return {};
  }
}

export function clearCredentials(userDataPath: string): void {
  const filePath = credentialsFilePath(userDataPath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
