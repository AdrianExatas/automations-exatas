"""Constantes de apresentacao da GUI."""

from __future__ import annotations

from ..core.xml_organizer import MODE_FLAT, MODE_YEAR, MODE_YEAR_MONTH


ORGANIZATION_LABEL_TO_MODE = {
    "Pasta unica": MODE_FLAT,
    "Por ano": MODE_YEAR,
    "Por ano e mes": MODE_YEAR_MONTH,
}
ORGANIZATION_MODE_TO_LABEL = {value: key for key, value in ORGANIZATION_LABEL_TO_MODE.items()}
ORGANIZATION_OPTIONS = list(ORGANIZATION_LABEL_TO_MODE.keys())
