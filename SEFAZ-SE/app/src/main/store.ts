import { app, safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type StoreData = Record<string, string>;

function getStorePath(): string {
  return join(app.getPath("userData"), "sefaz-store.json");
}

function readStore(): StoreData {
  try {
    const path = getStorePath();
    if (!existsSync(path)) return {};
    return JSON.parse(readFileSync(path, "utf8")) as StoreData;
  } catch {
    return {};
  }
}

function writeStore(data: StoreData): void {
  try {
    writeFileSync(getStorePath(), JSON.stringify(data, null, 2), "utf8");
  } catch {
    // ignore write errors silently
  }
}

function get(key: string): string | undefined {
  return readStore()[key];
}

function set(key: string, value: string): void {
  const data = readStore();
  data[key] = value;
  writeStore(data);
}

function del(key: string): void {
  const data = readStore();
  delete data[key];
  writeStore(data);
}

function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) return value;
  return safeStorage.encryptString(value).toString("base64");
}

function decrypt(encoded: string): string {
  if (!safeStorage.isEncryptionAvailable()) return encoded;
  try {
    return safeStorage.decryptString(Buffer.from(encoded, "base64"));
  } catch {
    return encoded;
  }
}

export type SavedCredentials = {
  user: string;
  password: string;
};

export type SavedAgilCredentials = {
  user: string;
  certPath: string;
  certPassword: string;
};

function saveCredentials(userKey: string, passKey: string, creds: SavedCredentials): void {
  set(userKey, creds.user);
  set(passKey, encrypt(creds.password));
}

function loadCredentials(userKey: string, passKey: string): SavedCredentials | null {
  const user = get(userKey);
  const encrypted = get(passKey);
  if (!user || !encrypted) return null;
  return { user, password: decrypt(encrypted) };
}

function clearCredentials(userKey: string, passKey: string): void {
  del(userKey);
  del(passKey);
}

function saveAgilCert(creds: SavedAgilCredentials): void {
  set(AGIL_USER_KEY, creds.user);
  set(AGIL_CERT_PATH_KEY, creds.certPath);
  set(AGIL_CERT_PASS_KEY, encrypt(creds.certPassword));
}

function loadAgilCert(): SavedAgilCredentials | null {
  const user = get(AGIL_USER_KEY);
  const certPath = get(AGIL_CERT_PATH_KEY);
  const encrypted = get(AGIL_CERT_PASS_KEY);
  if (!user || !certPath) return null;
  return {
    user,
    certPath,
    certPassword: encrypted ? decrypt(encrypted) : "",
  };
}

function clearAgilCert(): void {
  del(AGIL_USER_KEY);
  del(AGIL_CERT_PATH_KEY);
  del(AGIL_CERT_PASS_KEY);
  del(AGIL_PASS_KEY);
}

const SEFAZ_USER_KEY = "sefaz.user";
const SEFAZ_PASS_KEY = "sefaz.password";
const AGIL_USER_KEY = "agil.user";
const AGIL_PASS_KEY = "agil.password";
const AGIL_CERT_PATH_KEY = "agil.certPath";
const AGIL_CERT_PASS_KEY = "agil.certPassword";

export const sefazStore = {
  saveSefazCredentials: (creds: SavedCredentials) =>
    saveCredentials(SEFAZ_USER_KEY, SEFAZ_PASS_KEY, creds),
  loadSefazCredentials: () => loadCredentials(SEFAZ_USER_KEY, SEFAZ_PASS_KEY),
  clearSefazCredentials: () => clearCredentials(SEFAZ_USER_KEY, SEFAZ_PASS_KEY),

  saveAgilCredentials: (creds: SavedAgilCredentials) => saveAgilCert(creds),
  loadAgilCredentials: () => loadAgilCert(),
  clearAgilCredentials: () => clearAgilCert(),
};
