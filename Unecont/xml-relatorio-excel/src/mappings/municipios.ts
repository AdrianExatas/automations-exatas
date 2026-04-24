import rawMunicipios from "../data/municipios-ibge.json";

type MunicipioEntry = {
  nome: string;
  uf: string;
};

const municipios = rawMunicipios as Record<string, MunicipioEntry>;

export function resolveMunicipioDisplay(code: string, fallbackUf = ""): string {
  const entry = municipios[code];
  if (!entry) {
    return fallbackUf && code ? `Município ${code} - ${fallbackUf}` : "";
  }
  return `${entry.nome} - ${entry.uf || fallbackUf}`.trim();
}
