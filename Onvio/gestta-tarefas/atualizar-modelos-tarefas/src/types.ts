export interface FrequencyDate {
  business_day: number | null;
  start_day: number | null;
  month_day: number | null;
  month: number | null;
  week_day: number | null;
}

export interface GesttaTask {
  _id: string;
  name: string;
  type?: string;
  company_department: string | { _id: string; name?: string };
  subtype: string;
  competence?: number | null;
  frequency: string;
  frequency_date?: Partial<FrequencyDate> | null;
  sphere?: string | null;
  notify_customer?: boolean;
  accountancy?: number | null;
  fine?: boolean;
  business_day?: boolean;
  business_day_accountancy?: boolean;
  postpone?: boolean;
  accounting_view?: boolean;
  tags?: string[];
  active?: boolean;
  group_customer_count?: number;
  company_documents?: string[];
  notify_whatsapp?: boolean;
}

export interface CustomerTaskConfig {
  _id: string;
  company_task?: string | GesttaTask;
  company_user?: string | { _id?: string; name?: string } | null;
  approve?: boolean;
  approvers?: string[];
  approve_type?: string[];
  active?: boolean;
  customer?: string | { _id?: string; name?: string };
}

export interface TaskUpdatePayload {
  name: string;
  company_department: string;
  subtype: string;
  competence: number;
  frequency: string;
  frequency_date: FrequencyDate;
  sphere?: string;
  notify_customer: boolean;
  accountancy: number;
  fine: boolean;
  business_day: boolean;
  business_day_accountancy: boolean;
  postpone: boolean;
  accounting_view: boolean;
  tags: string[];
  active: boolean;
  link_existing_customers: boolean;
}

export interface GesttaStep {
  _id: string;
  name: string;
  order: number;
  required: boolean;
}

export interface TaskCustomerLink {
  _id: string;
  customer: string | { _id: string; name?: string };
  company_task?: string | { _id: string };
}

export type ManifestAction =
  | {
      op: "setActive";
      taskId: string;
      expectedName: string;
      active: boolean;
    }
  | {
      op: "rename";
      taskId: string;
      expectedName: string;
      name: string;
    }
  | {
      op: "setFrequencyBusinessDay";
      taskId: string;
      expectedName: string;
      frequency: string;
      businessDay: number;
      regenerateTaskGen?: boolean;
    }
  | {
      op: "addSteps";
      taskId: string;
      expectedName?: string;
      expectedNameAfterRename?: string;
      steps: Array<{ name: string; required?: boolean }>;
    };

export interface Manifest {
  schemaVersion: number;
  id: string;
  title: string;
  description?: string;
  actions: ManifestAction[];
}

export type ActionResultStatus =
  | "success"
  | "skipped"
  | "failure"
  | "planned"
  | "notStarted";

export interface ActionResult {
  op: ManifestAction["op"];
  taskId: string;
  name: string;
  result: ActionResultStatus;
  detail?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  intendedPayload?: TaskUpdatePayload;
  restorePayload?: TaskUpdatePayload;
  stepsAdded?: string[];
  regeneration?: RegenerationResult[];
}

export interface RegenerationResult {
  customerId: string;
  customerName?: string;
  result: ActionResultStatus;
  erase?: { ok: boolean; status: number; body: unknown };
  generate?: { ok: boolean; status: number; body: unknown };
  error?: string;
}

export interface BackupTaskEntry {
  id: string;
  name: string;
  originalTask: GesttaTask;
  restorePayload: TaskUpdatePayload;
  intendedPayload: TaskUpdatePayload;
  willUpdate: boolean;
  actionOps: string[];
}

export interface CliArgs {
  apply: boolean;
  dryRun: boolean;
  skipRegen: boolean;
  skipChecklists: boolean;
  manifestPath: string;
  reportsDir: string;
}
