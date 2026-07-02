export const downloadState = {
  executando: true,
  usarHeadless: false,
  paginaInicial: undefined as number | undefined,
  paginaFinal: undefined as number | undefined,
  dataSolicitacao: undefined as string | undefined,
  extrairZips: true,
  uploadAutomatico: false,
};

export function resetDownloadState(): void {
  downloadState.executando = true;
  downloadState.usarHeadless = false;
  downloadState.paginaInicial = undefined;
  downloadState.paginaFinal = undefined;
  downloadState.dataSolicitacao = undefined;
  downloadState.extrairZips = true;
  downloadState.uploadAutomatico = false;
}
