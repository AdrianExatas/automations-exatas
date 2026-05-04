import type { Dirent } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const INVALID_PATH_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizePathPart(value: string): string {
  const sanitized = value
    .normalize("NFKC")
    .replace(INVALID_PATH_CHARS, " - ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  return sanitized || "sem-nome";
}

export function outputXmlName(sourceEntry: string, perApur: string): string {
  const base = path.basename(sourceEntry.replaceAll("\\", "/"));
  const sanitized = sanitizePathPart(base);
  const xmlName = sanitized.toLowerCase().endsWith(".xml") ? sanitized : `${sanitized}.xml`;
  return `${sanitizePathPart(perApur)}-${xmlName}`;
}

export async function nextWritablePath(filePath: string, content: Uint8Array): Promise<string> {
  if (!(await exists(filePath))) {
    return filePath;
  }
  if (await hasSameContent(filePath, content)) {
    return filePath;
  }

  const directory = path.dirname(filePath);
  const extension = path.extname(filePath);
  const baseName = path.basename(filePath, extension);

  for (let index = 2; ; index += 1) {
    const candidate = path.join(directory, `${baseName} (${index})${extension}`);
    if (!(await exists(candidate))) {
      return candidate;
    }
    if (await hasSameContent(candidate, content)) {
      return candidate;
    }
  }
}

export async function findExistingXmlWithSameContent(directory: string, content: Uint8Array): Promise<string | undefined> {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return undefined;
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xml"))
    .map((entry) => path.join(directory, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  for (const filePath of files) {
    if (await hasSameContent(filePath, content)) {
      return filePath;
    }
  }

  return undefined;
}

async function hasSameContent(filePath: string, content: Uint8Array): Promise<boolean> {
  const existing = await readFile(filePath);
  if (existing.byteLength !== content.byteLength) {
    return false;
  }

  return existing.equals(Buffer.from(content.buffer, content.byteOffset, content.byteLength));
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
