import type { SefazAuthConfig } from "../../shared/sefaz-auth";

export type NotaFiscalAcao = "ignorar" | "alterar-imposto" | "adiar" | "zerar-cobranca";

export type NotaFiscalAlteracaoInput = {
  inscricaoMunicipal: string;
  nomeEmpresa: string;
  etiqueta: string;
  icmsNovo: string;
  icmsAtual: string;
  recolhimentoNovo: string;
  recolhimentoAtual: string;
  acao: NotaFiscalAcao;
  corRgb: string;
  observacao: string;
  adiar: boolean;
  rowNumber: number;
};

export type NotaFiscalAlteracaoEntry = {
  inscricaoMunicipal: string;
  nomeEmpresa: string;
  etiqueta: string;
  icmsNovo: string;
  icmsAtual: string;
  recolhimentoNovo: string;
  recolhimentoAtual: string;
  acao: NotaFiscalAcao;
  corRgb: string;
  observacao: string;
  adiar: boolean;
  rowNumber: number;
  status: "sucesso" | "erro" | "ignorado";
  mensagem?: string;
  timestamp: string;
};

/** Navegador usado pelo Playwright em modo headed (ver `nf-playwright`). */
export type PlaywrightBrowserChannel = "chrome" | "msedge" | "chromium";

export type RunAlterarNotaFiscalConfig = SefazAuthConfig & {
  user: string;
  password: string;
  spreadsheetPath: string;
  outDir: string;
  headless: boolean;
  dryRun: boolean;
  /** Em headed: força canal; omitido no Windows usa Edge instalado e cai no Chromium embutido se falhar. */
  browserChannel?: PlaywrightBrowserChannel;
  limit?: number;
  stepDelayMs: number;
  timeoutMs: number;
};

export type NotaFiscalMatch = {
  etiqueta: string;
  icms: string;
  recolhimento: string;
};
