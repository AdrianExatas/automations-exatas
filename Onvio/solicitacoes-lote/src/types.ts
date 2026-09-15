import type { ServiceRequestRow } from "@exatas/onvio-solicitacoes-servico";

export const DEFAULT_ONVIO_FIRM_COMPANY_ID = "DA26DD8B76C04A7B9A5EE3D029347E4D";

export interface UiAttachment {
  filePath: string;
  fileName: string;
}

export interface SheetPreviewRow extends ServiceRequestRow {
  rowIndex: number;
}

export interface RunBatchPayload {
  planilhaPath: string;
  rowAttachments: Record<number, UiAttachment[]>;
  commonAttachments: UiAttachment[];
  defaultDepartmentName?: string;
  defaultDepartmentId?: string;
  dryRun?: boolean;
  startWithoutCheckpoint?: boolean;
  reprocessFailures?: boolean;
}

export interface DepartmentPreference {
  id: string;
  name: string;
}

export interface CheckpointState {
  planilhaPath: string;
  successKeys: string[];
  failedKeys: string[];
  updatedAt: string;
}
