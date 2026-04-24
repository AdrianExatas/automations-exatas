"""Registro dos subcomandos da CLI."""

from . import danfe, desktop, download, extract, move_report, organize, upload

COMMAND_MODULES = [download, upload, extract, organize, danfe, move_report, desktop]

__all__ = ["COMMAND_MODULES"]
