export type ExecutionStrategy = 'http';

export interface EmpresaReportRow {
  identificacao: string;
  razao_social: string;
  msg_nao_lidas_lista: number;
  ultima_geral_origem: string;
  ultima_geral_numero: string;
  ultima_geral_orgao: string;
  ultima_geral_unidade: string;
  ultima_geral_assunto: string;
  ultima_geral_data_publicacao: string;
  ultima_geral_data_ciencia: string;
  ultima_geral_responsavel_ciencia: string;
  ultima_geral_link: string;
  ultima_nao_lida_numero: string;
  ultima_nao_lida_orgao: string;
  ultima_nao_lida_unidade: string;
  ultima_nao_lida_assunto: string;
  ultima_nao_lida_data_publicacao: string;
  ultima_nao_lida_data_ciencia: string;
  ultima_nao_lida_responsavel_ciencia: string;
  ultima_nao_lida_link: string;
  status: string;
  erro: string;
}

export interface FailureRow {
  identificacao: string;
  razao_social: string;
  erro: string;
}

export interface RunOptions {
  certificatePath: string;
  certificatePassword: string;
  certificateUser: string;
  outputDir: string;
  chromeChannel: 'chrome';
  executionStrategy: ExecutionStrategy;
}

export interface RunProgress {
  current: number;
  total: number;
  companyId: string;
  companyName: string;
}

export interface RunLogEntry {
  timestamp: string;
  level: 'info' | 'error';
  message: string;
}

export interface RunResult {
  outputPath: string;
  processed: number;
  failures: FailureRow[];
  startedAt: string;
  finishedAt: string;
}

export interface RunCallbacks {
  onLog?: (entry: RunLogEntry) => void;
  onProgress?: (progress: RunProgress) => void;
}

export interface AppConfig {
  certificate: {
    path: string;
    password: string;
    user: string;
  };
  output: {
    dir: string;
  };
  browser: {
    channel: 'chrome';
  };
  execution: {
    strategy: ExecutionStrategy;
  };
}

export interface ConfigEnvironment {
  userDataDir: string;
  documentsDir: string;
  resourcesDir: string;
  cwd: string;
}
