import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { CanonicalNfseRow } from "../types";

const HEADERS = [
  "Cnpj Empresa",
  "Empresa",
  "Municipio Tomador",
  "Conferido?",
  "Número NFe",
  "Código Verificador",
  "Data Competência",
  "Emissão NFe",
  "Cancelamento",
  "Prestador",
  "Cnpj/Cpf Prestador",
  "CCM/IM Prestador",
  "Município Prestador",
  "Regime Tributário",
  "CNAE",
  "CNAE Descrição",
  "Valor NFe",
  "Serviço Federal",
  "Serviço Municipal",
  "DESCRIÇÃO DO SERVIÇO",
  "QUAL SERVIÇO CONTRATADO",
  "Serviço Dentro do Município",
  "Base de Cálculo ISS",
  "Valor Líquido",
  "Link para NFSe",
] as const;

function setCell(
  worksheet: XLSX.WorkSheet,
  rowNumber: number,
  columnIndex: number,
  cell: XLSX.CellObject,
): void {
  const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnIndex });
  worksheet[address] = cell;
}

export function writeRawWorkbook(filePath: string, rows: CanonicalNfseRow[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const aoa: Array<Array<string | number>> = [
    [...HEADERS],
    ...rows.map((row) => [
      row.cnpjEmpresa,
      row.empresa,
      row.municipioTomador,
      row.conferido,
      row.numeroNfe,
      row.codigoVerificador,
      row.dataCompetencia,
      row.emissaoNfe,
      row.cancelamento,
      row.prestador,
      row.cnpjCpfPrestador,
      row.ccmImPrestador,
      row.municipioPrestador,
      row.regimeTributario,
      row.cnae,
      row.cnaeDescricao,
      row.valorNfe,
      row.servicoFederal,
      row.servicoMunicipal,
      row.descricaoDoServico,
      row.qualServicoContrato,
      row.servicoDentroMunicipio,
      row.baseCalculoIss,
      row.valorLiquido,
      row.linkParaNfse,
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const headerIndex = new Map<string, number>(HEADERS.map((header, index) => [header, index]));

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    setCell(worksheet, excelRow, headerIndex.get("Valor NFe")!, {
      t: "n",
      v: row.valorNfe,
      z: "0.00",
    });
    setCell(worksheet, excelRow, headerIndex.get("Base de Cálculo ISS")!, {
      t: "n",
      v: row.baseCalculoIss,
      z: "0.00",
    });
    setCell(worksheet, excelRow, headerIndex.get("Valor Líquido")!, {
      t: "n",
      v: row.valorLiquido,
      z: "0.00",
    });
  });

  XLSX.utils.book_append_sheet(workbook, worksheet, "Bruto");
  XLSX.writeFile(workbook, filePath);
}
