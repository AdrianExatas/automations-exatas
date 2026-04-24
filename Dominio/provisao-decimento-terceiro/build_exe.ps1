$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$env:PYTHONPATH = ""

python -m PyInstaller --noconfirm --clean .\separar_por_empresa.spec

Write-Host ""
Write-Host "Build concluido:"
Write-Host "dist\separar-por-empresa.exe"
