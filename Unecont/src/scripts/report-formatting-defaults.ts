import { resolveAssetPath } from "../project-paths";
import type { ReportFormattingOptions } from "../types";

export const DEFAULT_REPORT_MODEL_PATH = resolveAssetPath("templates", "report-model.xlsx");

export const DEFAULT_SERVICE_MAP_PATH = resolveAssetPath("mappings", "service-item-map.xlsx");

export function getDefaultReportFormattingOptions(): ReportFormattingOptions {
  return {
    enabled: true,
    modelPath: DEFAULT_REPORT_MODEL_PATH,
    serviceMapPath: DEFAULT_SERVICE_MAP_PATH,
    overwrite: true,
  };
}
