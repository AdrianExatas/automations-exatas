from __future__ import annotations

import configparser
import re
from datetime import date, datetime, timedelta
from pathlib import Path

from .models import NFSeItem, QueryPeriod


ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT_DIR / "config"
VAR_DIR = ROOT_DIR / "var"
DEFAULT_CONFIG_PATH = CONFIG_DIR / "financeiro.ini"
DEFAULT_ENV_PATH = CONFIG_DIR / ".env"
LEGACY_ENV_PATH = ROOT_DIR / "baixar-notas" / ".env"
LEGACY_RENAME_CONFIG_PATH = ROOT_DIR / "renomear-notas" / "config.ini"
DEFAULT_OUTPUT_ROOT = VAR_DIR / "saida_nfse"
DEFAULT_LOG_ROOT = VAR_DIR / "logs"
INPUT_COMPETENCIA_RE = re.compile(r"nfse_(\d{4})-(\d{2})", flags=re.IGNORECASE)


def ensure_runtime_dirs() -> None:
    DEFAULT_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    DEFAULT_LOG_ROOT.mkdir(parents=True, exist_ok=True)


def resolve_config_path(config_path: str | Path | None = None) -> Path | None:
    if config_path is not None:
        return Path(config_path).resolve()
    if DEFAULT_CONFIG_PATH.is_file():
        return DEFAULT_CONFIG_PATH
    if LEGACY_RENAME_CONFIG_PATH.is_file():
        return LEGACY_RENAME_CONFIG_PATH
    return None


def load_ini(config_path: str | Path | None = None) -> configparser.ConfigParser:
    cfg = configparser.ConfigParser()
    resolved = resolve_config_path(config_path)
    if resolved and resolved.is_file():
        cfg.read(resolved, encoding="utf-8")
    return cfg


def _config_get(
    cfg: configparser.ConfigParser,
    sections: tuple[str, ...],
    option: str,
) -> str | None:
    for section in sections:
        if cfg.has_section(section) and cfg.has_option(section, option):
            value = cfg.get(section, option).strip()
            if value:
                return value
    return None


def get_path_setting(
    cfg: configparser.ConfigParser,
    option: str,
    default: Path,
    *,
    config_path: str | Path | None = None,
) -> Path:
    value = _config_get(cfg, ("paths", "caminhos"), option)
    if not value:
        return default
    path = Path(value)
    if not path.is_absolute():
        resolved_config_path = resolve_config_path(config_path)
        base_dir = resolved_config_path.parent if resolved_config_path else ROOT_DIR
        path = base_dir / path
    return path.resolve()


def get_rename_setting(cfg: configparser.ConfigParser, option: str) -> str | None:
    return _config_get(cfg, ("renomeacao", "renomear_notas"), option)


def resolve_env_path(env_file: str | Path | None = None) -> Path | None:
    if env_file is not None:
        return Path(env_file).resolve()
    if DEFAULT_ENV_PATH.is_file():
        return DEFAULT_ENV_PATH
    if LEGACY_ENV_PATH.is_file():
        return LEGACY_ENV_PATH
    return None


def load_env(env_file: str | Path | None = None) -> dict[str, str]:
    env_path = resolve_env_path(env_file)
    if env_path is None or not env_path.exists():
        raise RuntimeError(
            "Arquivo .env nao encontrado. Use --env-file ou crie config/.env a partir de config/.env.example."
        )

    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()

    missing = [name for name in ("APP_KEY", "APP_SECRET") if not values.get(name)]
    if missing:
        raise RuntimeError(f"Variaveis ausentes no .env: {', '.join(missing)}")

    return values


def format_br_date(value: date) -> str:
    return value.strftime("%d/%m/%Y")


def competencia_to_slug(competencia: str) -> str:
    mes, ano = competencia.split("-", 1)
    return f"{ano}-{mes}"


def parse_competencia(competencia: str) -> QueryPeriod:
    try:
        mes_str, ano_str = competencia.split("-", 1)
        mes = int(mes_str)
        ano = int(ano_str)
    except ValueError as exc:
        raise RuntimeError(f"Competencia invalida: {competencia}. Use MM-AAAA.") from exc

    if mes < 1 or mes > 12:
        raise RuntimeError(f"Competencia invalida: {competencia}. Use MM-AAAA.")

    start_date = date(ano, mes, 1)
    if mes == 12:
        next_month = date(ano + 1, 1, 1)
    else:
        next_month = date(ano, mes + 1, 1)
    end_date = next_month - timedelta(days=1)
    return QueryPeriod(start_date=start_date, end_date=end_date, competencia=f"{mes:02d}-{ano}")


def previous_month_period(today: date | None = None) -> QueryPeriod:
    reference = today or date.today()
    first_day_current_month = reference.replace(day=1)
    last_day_previous_month = first_day_current_month - timedelta(days=1)
    first_day_previous_month = last_day_previous_month.replace(day=1)
    competencia = f"{first_day_previous_month.month:02d}-{first_day_previous_month.year}"
    return QueryPeriod(
        start_date=first_day_previous_month,
        end_date=last_day_previous_month,
        competencia=competencia,
    )


def default_competencia(reference: datetime | None = None) -> str:
    hoje = reference or datetime.now()
    periodo = previous_month_period(hoje.date())
    return periodo.competencia


def infer_competencia_from_input(path: Path) -> str | None:
    match = INPUT_COMPETENCIA_RE.search(path.name)
    if not match:
        return None
    ano, mes = match.groups()
    return f"{mes}-{ano}"


def infer_competencia_from_items(items: list[NFSeItem]) -> str | None:
    for item in items:
        if item.competencia:
            return item.competencia
    return None


def resolve_competencia(
    explicit_competencia: str = "",
    *,
    input_path: Path | None = None,
    items: list[NFSeItem] | None = None,
    config_path: str | Path | None = None,
    reference: datetime | None = None,
) -> str:
    competencia = explicit_competencia.strip()
    if competencia:
        return competencia

    if input_path is not None:
        competencia = infer_competencia_from_input(input_path) or ""
        if competencia:
            return competencia

    if items:
        competencia = infer_competencia_from_items(items) or ""
        if competencia:
            return competencia

    cfg = load_ini(config_path)
    competencia = get_rename_setting(cfg, "competencia") or ""
    if competencia:
        return competencia

    return default_competencia(reference=reference)


def resolve_output_root(
    output_dir: str | Path | None,
    *,
    competencia: str,
    config_path: str | Path | None = None,
) -> Path:
    cfg = load_ini(config_path)
    base_root = get_path_setting(cfg, "output_dir", DEFAULT_OUTPUT_ROOT, config_path=config_path)
    root = Path(output_dir).resolve() if output_dir is not None else base_root
    return (root / competencia).resolve()


def resolve_log_file(
    log_file: str | Path | None,
    *,
    stem: str,
    config_path: str | Path | None = None,
) -> Path | None:
    if log_file in (None, ""):
        return None
    if str(log_file).lower() == "auto":
        cfg = load_ini(config_path)
        log_dir = get_path_setting(cfg, "log_dir", DEFAULT_LOG_ROOT, config_path=config_path)
        log_dir.mkdir(parents=True, exist_ok=True)
        return log_dir / f"{stem}_{datetime.now().strftime('%Y%m%d')}.log"
    return Path(log_file).resolve()
