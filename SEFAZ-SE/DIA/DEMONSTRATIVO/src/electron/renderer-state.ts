import type { AlterarRunResult } from "./ipc-types";
import type { RunResult } from "../runner";
import type { XmlDownloadResult } from "../xml-downloads";

export type AppId = "demonstrativo" | "alterar";
export type RunningMode = "dia" | "xml" | "alterar";

export type RendererState = {
  activeApp: AppId;
  sidebarPinned: boolean;
  lastResult?: RunResult;
  lastXmlResult?: XmlDownloadResult;
  lastAlterarResult?: AlterarRunResult;
  activeOutDir: string;
  activeExcelPath: string;
  activeXmlExcelPath: string;
  activeProcessedCount: number;
  runningMode?: RunningMode;
};

export function createRendererState(): RendererState {
  return {
    activeApp: "demonstrativo",
    sidebarPinned: false,
    activeOutDir: "",
    activeExcelPath: "",
    activeXmlExcelPath: "",
    activeProcessedCount: 0,
  };
}

export function resetRendererState(state: RendererState): void {
  state.lastResult = undefined;
  state.lastXmlResult = undefined;
  state.lastAlterarResult = undefined;
  state.activeOutDir = "";
  state.activeExcelPath = "";
  state.activeXmlExcelPath = "";
  state.activeProcessedCount = 0;
}
