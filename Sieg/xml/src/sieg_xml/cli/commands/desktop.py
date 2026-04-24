"""Subcomando para abrir a interface desktop."""

from __future__ import annotations

import argparse

from ...gui.app import main as run_gui_app


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("desktop", help="Abrir a interface desktop.")
    parser.set_defaults(func=handle)


def handle(_args: argparse.Namespace) -> int:
    return run_gui_app()
