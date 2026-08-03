import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config.js";
import type { ApiClient, BinaryResponse } from "../http/api-client.js";
import { resolveAllowedOutput } from "../security/paths.js";
import type { FirmResolver } from "../operations/firm-resolver.js";
import type { CapabilityCatalog } from "../catalog/catalog.js";

export interface DocumentResourceResult {
  uri: string;
  mimeType: string;
  blob?: string;
  text?: string;
}

function safeFileName(raw: string | undefined, documentId: string): string {
  const base = path.basename((raw || documentId).replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_"));
  return base || `${documentId}.bin`;
}

function reserveOutputPath(fileName: string, outputDir: string): string {
  const parsed = path.parse(fileName);
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const candidateName = attempt === 0 ? fileName : `${parsed.name}-${attempt}${parsed.ext}`;
    const candidate = resolveAllowedOutput(candidateName, outputDir);
    try {
      const handle = fs.openSync(candidate, "wx", 0o600);
      fs.closeSync(handle);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("Não foi possível reservar um nome de arquivo para o download.");
}

export class DocumentResources {
  constructor(
    private readonly config: AppConfig,
    private readonly client: ApiClient,
    private readonly firms: FirmResolver,
    private readonly catalog: CapabilityCatalog,
  ) {}

  async read(uri: URL, provider: string, containerId: string, documentId: string): Promise<DocumentResourceResult> {
    if (provider !== "onvio") throw new Error(`Provedor de documentos não suportado: ${provider}`);
    const capability = await this.catalog.runtime("onvio.storage.document.download");
    if (!capability.available || capability.status !== "verified") {
      throw new Error(`Download indisponível: ${capability.availabilityReason || capability.status}`);
    }
    const firmId = await this.firms.resolve();
    const response = await this.client.request<BinaryResponse>({
      provider: "onvio",
      method: "GET",
      path: `/api/storage/v1/Folders/${encodeURIComponent(containerId)}/documents/${encodeURIComponent(documentId)}`,
      headers: { "x-company-id": firmId },
      readLike: true,
      responseMode: "binary",
    });

    if (response.contentLength <= this.config.maxDocumentBytes) {
      return {
        uri: uri.href,
        mimeType: response.contentType,
        blob: Buffer.from(response.bytes).toString("base64"),
      };
    }

    const outputPath = reserveOutputPath(safeFileName(response.fileName, documentId), this.config.outputDir);
    try {
      fs.writeFileSync(outputPath, response.bytes, { flag: "w" });
    } catch (error) {
      try {
        fs.rmSync(outputPath);
      } catch {
        // Mantém o erro original; o arquivo reservado estava vazio.
      }
      throw error;
    }
    return {
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify({
        stored: true,
        path: outputPath,
        size: response.contentLength,
        contentType: response.contentType,
        reason: `Documento maior que ${this.config.maxDocumentBytes} bytes.`,
      }),
    };
  }
}
