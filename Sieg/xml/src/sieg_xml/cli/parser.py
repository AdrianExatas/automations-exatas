"""Construcao do parser principal da CLI."""

from __future__ import annotations

import argparse

from .commands import COMMAND_MODULES


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="sieg-xml", description="CLI da automacao SIEG XML.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    for module in COMMAND_MODULES:
        module.register(subparsers)

    return parser
