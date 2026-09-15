/**
 * Decodificador Base64 e Parser XML robusto para a DCTFWeb
 */
import { XMLParser } from "fast-xml-parser";

export class DctfwebXmlParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      removeNSPrefix: true, // Remove prefixos de namespace (ex: ns2:tag -> tag)
      trimValues: true,
      parseTagValue: false,
      isArray: (name) => {
        // Garantir que coleções de débitos/tributos sejam sempre arrays
        return [
          "debito",
          "debitos",
          "tributo",
          "tributos",
          "item",
          "itens",
          "origemDebito",
          "origem",
          "creditotributarioapurado",
          "apuracaodebito",
        ].includes(name.toLowerCase());
      },
    });
  }

  public decodeBase64(base64Str: string): string {
    if (!base64Str || !base64Str.trim()) {
      throw new Error("Conteúdo Base64 vazio.");
    }
    const clean = base64Str.replace(/\s+/g, "");
    const buffer = Buffer.from(clean, "base64");
    return buffer.toString("utf-8");
  }

  public parseXml(xmlContent: string): Record<string, unknown> {
    if (!xmlContent || !xmlContent.trim()) {
      throw new Error("XML da DCTFWeb está vazio.");
    }
    try {
      return this.parser.parse(xmlContent) as Record<string, unknown>;
    } catch (err: unknown) {
      throw new Error(`Falha ao processar XML da DCTFWeb: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public decodeAndParse(base64Str: string): Record<string, unknown> {
    const xml = this.decodeBase64(base64Str);
    return this.parseXml(xml);
  }
}
