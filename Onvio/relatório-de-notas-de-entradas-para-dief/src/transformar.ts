import {
  COLUNAS_SAIDA,
  LinhaEntrada,
  LinhaSaida,
  MAPEAMENTO_ENTRADA_PARA_SAIDA,
} from "./types";

export function transformarLinhas(linhasEntrada: LinhaEntrada[]): LinhaSaida[] {
  return linhasEntrada.map((entrada) => {
    const saida = {} as LinhaSaida;

    for (const [colunaEntrada, colunaSaida] of Object.entries(MAPEAMENTO_ENTRADA_PARA_SAIDA)) {
      const valor = entrada[colunaEntrada];
      if (typeof valor === "number") {
        saida[colunaSaida] = valor;
      } else {
        saida[colunaSaida] = String(valor ?? "").trim();
      }
    }

    saida["Recebida "] = "";
    saida["Finalidade dos produtos "] = "";

    return saida;
  });
}

export function linhaSaidaParaArray(linha: LinhaSaida): (string | number)[] {
  return COLUNAS_SAIDA.map((coluna) => linha[coluna]);
}

export { COLUNAS_SAIDA };
