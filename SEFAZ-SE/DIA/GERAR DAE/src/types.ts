export type PlaywrightBrowserChannel = "chrome";

export type DaeReferencia = {
  ano: number;
  mes: number;
};

export type Contribuinte = {
  cdPessoaContribuinte: string;
  razaoSocial: string;
  fonte: string;
};

export type GerarDaeConfig = {
  user: string;
  password: string;
  headless: boolean;
  timeoutMs: number;
  modelDir: string;
  outDir: string;
  referencia?: DaeReferencia;
  browserChannel?: PlaywrightBrowserChannel;
};
