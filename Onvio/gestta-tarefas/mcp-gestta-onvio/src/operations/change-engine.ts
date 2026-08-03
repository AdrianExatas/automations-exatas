import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { AuditLogger } from "../security/audit.js";
import type { CapabilityCatalog } from "../catalog/catalog.js";
import type { AppConfig } from "../config.js";
import type { OperationResult, PreparedChange } from "../types.js";
import { redact, safeError } from "../security/redact.js";
import type { OperationExecutor } from "./executor.js";
import { filterInputForSchema } from "./schema-validation.js";

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
    .join(",")}}`;
}

function digest(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function sameToken(expected: string, actual: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export class ChangeEngine {
  private readonly plans = new Map<string, PreparedChange>();
  private readonly completedByIdempotencyKey = new Map<string, { inputDigest: string; result: OperationResult }>();
  private readonly inFlightIdempotencyKeys = new Set<string>();

  constructor(
    private readonly config: AppConfig,
    private readonly catalog: CapabilityCatalog,
    private readonly executor: OperationExecutor,
    private readonly audit: AuditLogger,
  ) {}

  async prepare(
    operationId: string,
    input: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<PreparedChange> {
    const capability = await this.catalog.runtime(operationId);
    if (capability.kind !== "write") throw new Error("Somente operações de escrita podem ser preparadas.");
    if (!capability.available || capability.status !== "verified") {
      throw new Error(`Operação indisponível: ${capability.availabilityReason || capability.unavailableReason}`);
    }
    if (idempotencyKey && this.completedByIdempotencyKey.has(idempotencyKey)) {
      throw new Error("A chave de idempotência já foi concluída.");
    }

    let before: unknown;
    if (capability.preflightOperationId) {
      const preflight = this.catalog.definition(capability.preflightOperationId);
      const preflightInput = filterInputForSchema(preflight.inputSchema, input);
      before = (await this.executor.query(capability.preflightOperationId, preflightInput)).data;
    }
    const now = Date.now();
    const safeInput = redact(input) as Record<string, unknown>;
    const plan: PreparedChange = {
      planId: randomUUID(),
      confirmationToken: randomBytes(24).toString("base64url"),
      operationId,
      input: safeInput,
      inputDigest: digest({ operationId, input: safeInput }),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.config.confirmationTtlMs).toISOString(),
      summary: `${capability.title}: alteração preparada para confirmação.`,
      before: redact(before),
      beforeDigest: before === undefined ? undefined : digest(before),
      after: safeInput,
      warnings: [
        capability.risk === "destructive" ? "Esta operação pode excluir ou desvincular dados." : "",
        capability.risk === "financial" ? "Esta operação pode produzir impacto financeiro." : "",
        capability.idempotent ? "Operação declarada idempotente." : "Não haverá repetição automática.",
      ].filter(Boolean),
      used: false,
      idempotencyKey,
    };
    this.plans.set(plan.planId, plan);
    this.audit.write({ action: "prepare", operationId, planId: plan.planId, inputDigest: plan.inputDigest });
    return { ...plan };
  }

  async commit(planId: string, confirmationToken: string): Promise<OperationResult> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error("Plano não encontrado ou servidor reiniciado.");
    if (plan.used) throw new Error("Token de confirmação já utilizado.");
    if (Date.parse(plan.expiresAt) <= Date.now()) {
      this.plans.delete(planId);
      throw new Error("Plano expirado; prepare a alteração novamente.");
    }
    if (!sameToken(plan.confirmationToken, confirmationToken)) throw new Error("Token de confirmação inválido.");
    if (digest({ operationId: plan.operationId, input: plan.input }) !== plan.inputDigest) {
      throw new Error("Integridade do plano inválida.");
    }
    const capability = await this.catalog.runtime(plan.operationId);
    if (!capability.available || capability.status !== "verified") {
      throw new Error(`Operação não está mais disponível: ${capability.availabilityReason || capability.status}`);
    }
    if (capability.preflightOperationId && plan.beforeDigest !== undefined) {
      const preflight = this.catalog.definition(capability.preflightOperationId);
      const preflightInput = filterInputForSchema(preflight.inputSchema, plan.input);
      const current = (await this.executor.query(capability.preflightOperationId, preflightInput)).data;
      if (digest(current) !== plan.beforeDigest) {
        throw new Error("O estado remoto mudou desde a prévia; prepare a operação novamente.");
      }
    }

    if (plan.idempotencyKey) {
      const completed = this.completedByIdempotencyKey.get(plan.idempotencyKey);
      if (completed) {
        plan.used = true;
        if (completed.inputDigest !== plan.inputDigest) throw new Error("Chave de idempotência reutilizada com outro payload.");
        return completed.result;
      }
      if (this.inFlightIdempotencyKeys.has(plan.idempotencyKey)) {
        throw new Error("Já existe um commit em andamento para esta chave de idempotência.");
      }
      this.inFlightIdempotencyKeys.add(plan.idempotencyKey);
    }
    plan.used = true;
    try {
      const result = await this.executor.write(plan.operationId, plan.input);
      if (plan.idempotencyKey) this.completedByIdempotencyKey.set(plan.idempotencyKey, { inputDigest: plan.inputDigest, result });
      this.audit.write({ action: "commit", operationId: plan.operationId, planId, success: true, result });
      return result;
    } catch (error) {
      this.audit.write({ action: "commit", operationId: plan.operationId, planId, success: false, error: safeError(error) });
      throw error;
    } finally {
      if (plan.idempotencyKey) this.inFlightIdempotencyKeys.delete(plan.idempotencyKey);
    }
  }

  cancel(planId: string): { cancelled: boolean } {
    const plan = this.plans.get(planId);
    if (!plan) return { cancelled: false };
    this.plans.delete(planId);
    this.audit.write({ action: "cancel", operationId: plan.operationId, planId });
    return { cancelled: true };
  }
}
