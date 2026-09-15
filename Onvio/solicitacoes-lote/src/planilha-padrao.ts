import * as XLSX from "xlsx";

export const PLANILHA_PADRAO_HEADERS = [
  "CNPJ",
  "CODIGO",
  "EMPRESA",
  "SOLICITANTE",
  "DEPARTAMENTO",
  "ASSUNTO",
  "DESCRICAO",
];

const instrucoes = [
  ["Campo", "Como preencher"],
  ["CNPJ", "CNPJ ou CPF do cliente. Obrigatorio."],
  ["CODIGO", "Codigo do cliente no Onvio. Recomendado para localizar a empresa."],
  ["EMPRESA", "Nome da empresa. Usado em logs e no assunto padrao se o assunto vier vazio."],
  ["SOLICITANTE", "Nome do contato do cliente no Portal, como aparece no Onvio."],
  ["DEPARTAMENTO", "Nome do setor. Ex.: Fiscal, Pessoal, Contabil. Pode usar o fallback da tela."],
  ["ASSUNTO", "Assunto da solicitacao."],
  ["DESCRICAO", "Descricao completa da solicitacao."],
  [],
  ["Observacoes"],
  ["Os arquivos sao anexados na interface do aplicativo, nao nesta planilha."],
  ["Na tela, use a flag Replicar para enviar o mesmo arquivo a todas as solicitacoes."],
  ["Mantenha os nomes das colunas desta aba."],
];

export function criarPlanilhaPadrao(filePath: string): void {
  const workbook = XLSX.utils.book_new();
  const preenchimento = XLSX.utils.aoa_to_sheet([PLANILHA_PADRAO_HEADERS]);
  preenchimento["!cols"] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 40 },
    { wch: 28 },
    { wch: 16 },
    { wch: 36 },
    { wch: 48 },
  ];

  const instrucoesSheet = XLSX.utils.aoa_to_sheet(instrucoes);
  instrucoesSheet["!cols"] = [{ wch: 18 }, { wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, preenchimento, "Preenchimento");
  XLSX.utils.book_append_sheet(workbook, instrucoesSheet, "Instrucoes");
  XLSX.writeFile(workbook, filePath);
}
