$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root "vendor\gerador\vendor"
$source = Join-Path (Split-Path $root -Parent) "gerador-pop-it\skills\gerar-pop-it\vendor"

if (-not (Test-Path $source)) {
  Write-Error "Fonte não encontrada: $source. Instale o gerador-pop-it primeiro."
  exit 1
}

if (Test-Path $target) {
  Write-Host "Vendor já existe: $target"
  exit 0
}

cmd /c mklink /J "$target" "$source"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Junction falhou; copiando (pode demorar)..."
  robocopy $source $target /E /NFL /NDL /NJH /NJS | Out-Null
}

Write-Host "Vendor pronto: $target"
