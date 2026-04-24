import path from "node:path";
import { convertNfseXmlDirectory } from "../convert";

function readOption(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function requireInputDir(args: string[]): string {
  const value = readOption(args, "--input-dir");
  if (!value) {
    throw new Error(
      "Uso: bun run xml-to-excel -- --input-dir <pasta> [--output-file <arquivo>] [--error-report-file <arquivo>] [--template-path <arquivo>] [--service-map-path <arquivo>]",
    );
  }
  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputDir = requireInputDir(args);
  const result = await convertNfseXmlDirectory({
    inputDir,
    outputFile: readOption(args, "--output-file"),
    errorReportFile: readOption(args, "--error-report-file"),
    templatePath: readOption(args, "--template-path"),
    serviceMapPath: readOption(args, "--service-map-path"),
  });

  console.log(
    JSON.stringify(
      {
        outputFile: path.resolve(result.outputFile),
        errorReportFile: path.resolve(result.errorReportFile),
        summary: result.summary,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
