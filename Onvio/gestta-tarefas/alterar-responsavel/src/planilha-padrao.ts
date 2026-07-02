import * as XLSX from "xlsx";

export const PLANILHA_PADRAO_HEADERS = [
  "COD.",
  "CNPJ",
  "EMPRESA",
  "RESPONSAVEL",
  "MES GERACAO",
  "SETOR",
];

const instrucoes = [
  ["Campo", "Como preencher"],
  ["COD.", "Codigo interno do cliente, se houver. Campo opcional."],
  ["CNPJ", "CNPJ do cliente com 14 digitos. Pode usar pontuacao."],
  ["EMPRESA", "Nome da empresa. Campo opcional, usado em logs e relatorios."],
  ["RESPONSAVEL", "Nome do funcionario exatamente como esta no Gestta."],
  ["MES GERACAO", "Mes de referencia no formato MM/AAAA, por exemplo 05/2026."],
  ["SETOR", "Obrigatorio. Setor/departamento a alterar. Exemplo: Fiscal, Pessoal ou Contabil."],
  [],
  ["Observacoes"],
  ["A automacao processa apenas linhas com CNPJ, RESPONSAVEL e SETOR preenchidos."],
  ["A aba Preenchimento deve manter os nomes das colunas."],
];

export function criarPlanilhaPadrao(filePath: string): void {
  const workbook = XLSX.utils.book_new();
  const preenchimento = XLSX.utils.aoa_to_sheet([PLANILHA_PADRAO_HEADERS]);
  preenchimento["!cols"] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 44 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
  ];

  const instrucoesSheet = XLSX.utils.aoa_to_sheet(instrucoes);
  instrucoesSheet["!cols"] = [{ wch: 18 }, { wch: 72 }];

  XLSX.utils.book_append_sheet(workbook, preenchimento, "Preenchimento");
  XLSX.utils.book_append_sheet(workbook, instrucoesSheet, "Instrucoes");
  XLSX.writeFile(workbook, filePath);
}
