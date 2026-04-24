from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Literal


FileFormat = Literal["xml", "pdf", "ambos"]


@dataclass(frozen=True)
class NFSeItem:
    cnpj_emissor: str
    codigo_verificacao: str
    numero: str
    data_emissao: str | None = None
    hora_emissao: str | None = None

    @classmethod
    def from_json_dict(cls, item: dict[str, object]) -> "NFSeItem":
        emissao = item.get("Emissao")
        emissao_data = emissao if isinstance(emissao, dict) else {}

        return cls(
            cnpj_emissor=str(item.get("cCNPJEmissor") or "").strip(),
            codigo_verificacao=str(item.get("cCodigoVerifNFSe") or "").strip(),
            numero=str(item.get("nNumeroNFSe") or "").strip(),
            data_emissao=str(emissao_data.get("cDataEmissao") or "").strip() or None,
            hora_emissao=str(emissao_data.get("cHoraEmissao") or "").strip() or None,
        )

    def to_json_dict(self) -> dict[str, object]:
        payload: dict[str, object] = {
            "cCNPJEmissor": self.cnpj_emissor,
            "cCodigoVerifNFSe": self.codigo_verificacao,
            "nNumeroNFSe": self.numero,
        }
        if self.data_emissao or self.hora_emissao:
            payload["Emissao"] = {
                "cDataEmissao": self.data_emissao,
                "cHoraEmissao": self.hora_emissao,
            }
        return payload

    @property
    def competencia(self) -> str | None:
        if not self.data_emissao:
            return None
        try:
            _dia, mes, ano = self.data_emissao.split("/")
        except ValueError:
            return None
        if len(mes) != 2 or len(ano) != 4:
            return None
        return f"{mes}-{ano}"


@dataclass(frozen=True)
class QueryPeriod:
    start_date: date
    end_date: date
    competencia: str


@dataclass(frozen=True)
class DownloadResult:
    successes: int
    failures: int
    output_dir: Path


@dataclass(frozen=True)
class RenameResult:
    renomeados: int
    nao_encontrados: int
    erros: int


@dataclass(frozen=True)
class ProcessResult:
    json_path: Path
    download: DownloadResult
