import path from "path";

export const APP_DATA_DIR_NAME = "Parametrizacao Onboarding Gestta";
export const PACKAGED_RESOURCES_DIR = "resources";

export function resolveReportsDir(documentsPath: string): string {
  return path.join(documentsPath, APP_DATA_DIR_NAME, "relatorios");
}

export function resolveDefaultResourcePath(options: {
  fileName: string;
  isPackaged: boolean;
  processResourcesPath: string;
  projectRoot: string;
}): string {
  if (options.isPackaged) {
    return path.join(options.processResourcesPath, PACKAGED_RESOURCES_DIR, options.fileName);
  }

  return path.join(options.projectRoot, options.fileName);
}
