/**
 * Tipos e interfaces de domínio para a conferência REINF × DCTFWeb × Domínio
 */

export type ReinfSeries = "R-2000" | "R-4000";

export type ReinfEventCode =
  // R-2000
  | "R-2010" // Serviços Tomados
  | "R-2020" // Serviços Prestados
  | "R-2040" // Recursos Repassados para Associação Desportiva
  | "R-2050" // Comercialização da Produção por Produtor Rural PJ/Agroindústria
  | "R-2055" // Aquisição de Produção Rural
  | "R-2060" // CPRB - Contribuição Previdenciária sobre a Receita Bruta
  | "R-2098" // Reabertura dos Eventos Periódicos
  | "R-2099" // Fechamento dos Eventos Periódicos
  | "R-5011" // Informações de bases e tributos consolidadas por período
  // R-4000
  | "R-4010" // Pagamentos/créditos a beneficiário pessoa física
  | "R-4020" // Pagamentos/créditos a beneficiário pessoa jurídica
  | "R-4040" // Pagamentos/créditos a beneficiários não identificados
  | "R-4080" // Retenção no recebimento (auto-retenção PJ)
  | "R-4098" // Reabertura dos Eventos Periódicos Série R-4000
  | "R-4099" // Fechamento dos Eventos Periódicos Série R-4000
  | "R-9015"; // Consolidação das retenções na fonte

export type OrigemDctfweb =
  | 6 // Reinf CP (Contribuição Previdenciária - R-2000)
  | 7 // Reinf RET (Retenções na Fonte - R-4000)
  | number;

export type StatusConferencia =
  | "CONFORME"
  | "DIVERGENTE"
  | "PENDENTE"
  | "SEM_DCTFWEB"
  | "ERRO";

export type SituacaoDetalhe =
  | "conforme"
  | "divergente"
  | "somente_dominio"
  | "somente_dctfweb"
  | "nao_comparavel";

export type TipoValorFiscal =
  | "base"
  | "devido"
  | "deducao"
  | "retencao"
  | "suspenso"
  | "saldo_exigivel";

export interface Empresa {
  codiEmp: string;
  cnpj: string; // 14 dígitos sem máscara
  razaoSocial: string;
  ativo?: boolean;
  situacao?: string; // "A" = Ativa, "I" = Inativa
}

export interface FechamentoReinf {
  serie: ReinfSeries;
  eventoFechamento: "R-2099" | "R-4099";
  competencia: string; // AAAA-MM
  recibo: string;
  dataHoraEnvio: string;
  aceito: boolean;
  excluido: boolean;
  reabertoPosteriormente: boolean;
  temMovimento: boolean;
  errosTransmissao?: string[];
}

export interface TotalizadorItem {
  serie: ReinfSeries;
  origem: 6 | 7;
  eventoOrigem?: ReinfEventCode;
  codigoReceita: string; // Ex: "1162-01", "1708", "0588"
  descricaoReceita?: string;
  baseCalculo: number;
  valorDevido: number;
  valorDeducao: number;
  valorRetencao: number;
  valorSuspenso: number;
  saldoExigivel: number;
}

export interface DominioReinfData {
  empresa: Empresa;
  competencia: string; // AAAA-MM
  fechamentoR2000?: FechamentoReinf;
  fechamentoR4000?: FechamentoReinf;
  itens: TotalizadorItem[];
  pendencias: string[];
}

export interface DctfwebTributoItem {
  origem: OrigemDctfweb; // 6 para CP, 7 para RET
  codigoReceita: string; // Ex: "1162-01", "1708"
  descricao?: string;
  baseCalculo: number;
  valorDevido: number;
  valorDeducao: number;
  valorRetencao: number;
  valorSuspenso: number;
  saldoExigivel: number;
}

export interface DctfwebParsedDeclaration {
  cnpj: string; // 14 dígitos sem máscara
  competencia: string; // AAAA-MM
  categoria: string;
  numeroRecibo: string;
  tipoDeclaracao: "ORIGINAL" | "RETIFICADORA";
  dataTransmissao?: string;
  totalApuradoOrigem6: number;
  totalApuradoOrigem7: number;
  tributos: DctfwebTributoItem[];
}

export interface ReconciliationDetailItem {
  serie: ReinfSeries;
  origem: 6 | 7;
  codigoReceita: string;
  tipoValor: TipoValorFiscal;
  valorDominio: number;
  valorDctfweb: number;
  diferenca: number; // valorDominio - valorDctfweb
  situacao: SituacaoDetalhe;
  observacao?: string;
}

export interface ReconciliationResult {
  empresa: Empresa;
  competencia: string; // AAAA-MM
  status: StatusConferencia;
  reciboReinfR2000?: string;
  reciboReinfR4000?: string;
  reciboDctfweb?: string;
  totalDominioOrigem6: number;
  totalDctfwebOrigem6: number;
  diferencaOrigem6: number;
  totalDominioOrigem7: number;
  totalDctfwebOrigem7: number;
  diferencaOrigem7: number;
  totalGeralDominio: number;
  totalGeralDctfweb: number;
  diferencaGeral: number;
  detalhes: ReconciliationDetailItem[];
  fechamentosUtilizados: string[];
  pendencias: string[];
  mensagens: string[];
  dataProcessamento: string;
  hashResultado: string;
  dataUltimaConsulta?: string;
  origemConsulta?: "SERPRO_LIVE" | "CACHE_PERSISTIDO";
}

export interface BatchSummary {
  competencia: string;
  totalEmpresas: number;
  conformes: number;
  divergentes: number;
  pendentes: number;
  semDctfweb: number;
  erros: number;
  tempoExecucaoMs: number;
  chamadasSerproEstimadas: number;
  chamadasSerproRealizadas: number;
  resultados: ReconciliationResult[];
}

export interface DominioCompanyOverview {
  empresa: Empresa;
  competencia: string;
  reciboR2000: string | null;
  reciboR4000: string | null;
  reabertoR2000: boolean;
  reabertoR4000: boolean;
  totalR2000: number;
  totalR4000: number;
  totalGeralDominio: number;
  temMovimento: boolean;
  statusDominio: "CONCLUIDO" | "REABERTO" | "SEM_MOVIMENTO" | "SEM_FECHAMENTO";
}

export interface DominioCompetenciaItem {
  competencia: string;
  totalEmpresas: number;
  totalFechamentos: number;
}

