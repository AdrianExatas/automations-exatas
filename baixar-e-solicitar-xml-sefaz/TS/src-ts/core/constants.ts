export const Timeouts = {
  downloadWaitInitial: 0.5,
  downloadCheckInterval: 0.5,
  downloadCompleteCheck: 1.0,
  downloadMaxWait: 120,
  fileMoveRetryDelay: 1.0,
  fileCopyFallbackDelay: 0.5,
  pageLoad: 2.0,
  elementClick: 0.1,
  navigation: 0.2,
  errorCheck: 2.0,
  defaultTimeout: 10,
  pollFrequency: 0.3,
};

export const FileConfig = {
  minFileSize: 100,
  maxFileNameLength: 255,
  checkpointMaxAgeDays: 7,
  maxMoveRetries: 5,
  maxDownloadRetries: 3,
};

export const RetryConfig = {
  defaultMaxTentativas: 3,
  defaultBackoffBase: 2.0,
  minWaitTime: 0.5,
  maxWaitTime: 10.0,
};

export const CapturaContinuaConfig = {
  maxDiasRecuperacao: 30,
  horaDownload: "09:00",
  horaConsulta: "10:00",
  limiteXmlsSefaz: 3000,
};

export const SIMBOLOS = {
  sucesso: "[OK]",
  erro: "[ERRO]",
  info: "[INFO]",
  aviso: "[AVISO]",
  login: "[LOGIN]",
  menu: "[MENU]",
  fechar: "[FECHAR]",
  empresa: "[EMPRESA]",
  download: "[DOWNLOAD]",
} as const;
