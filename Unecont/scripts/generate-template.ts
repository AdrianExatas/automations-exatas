/**
 * Gera o modelo de planilha de entrada usado pelo workflow Unecont.
 */
import fs from "node:fs";
import path from "node:path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

const ROWS = [
  [
    "CNPJ/CPF",
    "Código",
    "Empresa",
    "Solicitante",
    "Departamento",
    "Assunto",
    "Descrição",
    "QTD_ARQUIVOS",
    "ARQUIVOS",
  ],
  [
    "00.000.000/0001-91",
    "1",
    "Empresa Exemplo Ltda",
    "Fulano",
    "Contabilidade",
    "Relatório Serviços Tomados",
    "Exemplo para preenchimento",
    "2",
    "Empresa 1 - Relatorio A.pdf; Empresa 1 - Relatorio B.xlsx",
  ],
  [
    "11.111.111/0001-11",
    "2",
    "Outra Empresa SA",
    "Ciclano",
    "Fiscal",
    "Serviços Tomados",
    "Segunda linha de exemplo",
    "",
    "",
  ],
];

function main(): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ROWS);
  XLSX.utils.book_append_sheet(wb, ws, "Empresas");

  const outDir = path.join(process.cwd(), "assets", "templates");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "empresas-template.xlsx");
  XLSX.writeFile(wb, outPath);
  console.log("Modelo gravado em:", outPath);
}

main();
