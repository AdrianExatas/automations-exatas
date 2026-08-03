import type { JsonSchema } from "../types.js";

function typeMatches(type: string | undefined, value: unknown): boolean {
  if (!type) return true;
  if (type === "object") return Boolean(value && typeof value === "object" && !Array.isArray(value));
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

export function validateInput(schema: JsonSchema, value: unknown, location = "input"): void {
  if (!typeMatches(schema.type, value)) throw new Error(`${location} deve ser ${schema.type}.`);
  if (schema.enum && !schema.enum.includes(value as never)) {
    throw new Error(`${location} deve ser um de: ${schema.enum.join(", ")}.`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) throw new Error(`${location} abaixo do mínimo.`);
    if (schema.maximum !== undefined && value > schema.maximum) throw new Error(`${location} acima do máximo.`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateInput(schema.items!, item, `${location}[${index}]`));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const required of schema.required || []) {
      if (record[required] === undefined || record[required] === null || record[required] === "") {
        throw new Error(`${location}.${required} é obrigatório.`);
      }
    }
    for (const [key, item] of Object.entries(record)) {
      const child = schema.properties?.[key];
      if (child) validateInput(child, item, `${location}.${key}`);
      else if (schema.additionalProperties === false) throw new Error(`${location}.${key} não é aceito.`);
    }
  }
}

export function filterInputForSchema(schema: JsonSchema, input: Record<string, unknown>): Record<string, unknown> {
  if (!schema.properties) return { ...input };
  return Object.fromEntries(Object.entries(input).filter(([key]) => key in schema.properties!));
}
