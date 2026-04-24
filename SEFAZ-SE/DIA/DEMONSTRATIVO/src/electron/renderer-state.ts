import type { RunResult } from "../runner";
import type { XmlDownloadResult } from "../xml-downloads";

export type RunningMode = "dia" | "xml";

export type RendererState = {
  lastResult?: RunResult;
  lastXmlResult?: XmlDownloadResult;
  activeOutDir: string;
  activeExcelPath: string;
  activeXmlExcelPath: string;
  activeProcessedCount: number;
  runningMode?: RunningMode;
};

export function createRendererState(): RendererState {
  return {
    activeOutDir: "",
    activeExcelPath: "",
    activeXmlExcelPath: "",
    activeProcessedCount: 0,
  };
}

export function resetRendererState(state: RendererState): void {
  state.lastResult = undefined;
  state.lastXmlResult = undefined;
  state.activeOutDir = "";
  state.activeExcelPath = "";
  state.activeXmlExcelPath = "";
  state.activeProcessedCount = 0;
}
