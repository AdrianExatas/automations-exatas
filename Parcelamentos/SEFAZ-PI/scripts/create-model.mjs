import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "model.xlsx");

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet([
  {
    CODIGO: "001",
    EMPRESA: "",
    CNPJ: "",
    "INSCRICAO ESTADUAL": "",
    "NUMERO PARCELAMENTO": "",
    PARCELA: "",
    VENCIMENTO: "",
    "TIPO RECEITA": "",
    "LOCAL PARA SALVAR ARQUIVO": "output/pdfs",
  },
]);
XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
XLSX.writeFile(workbook, out);
fs.mkdirSync(path.join(root, "output", "pdfs"), { recursive: true });
console.log(`Escrito: ${out}`);
