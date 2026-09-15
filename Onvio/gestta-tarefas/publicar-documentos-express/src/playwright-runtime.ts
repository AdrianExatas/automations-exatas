import path from "path";

export function configureBundledPlaywright(isPackaged: boolean, resourcesPath: string): string | undefined {
  if (!isPackaged) return undefined;
  const browsersPath = path.join(resourcesPath, "ms-playwright");
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  return browsersPath;
}
