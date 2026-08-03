$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$storage = Join-Path $root "storage"
$publish = if ($env:PUBLISH_ROOT) { $env:PUBLISH_ROOT } else { Join-Path $storage "GESTAO DE PROCESSOS" }

$dirs = @(
  $storage,
  (Join-Path $storage "uploads"),
  (Join-Path $storage "outputs"),
  (Join-Path $storage "work"),
  (Join-Path $publish "00 - Entrada de Documentacoes"),
  $publish
)

foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path $d | Out-Null
}

Write-Host "Storage pronto em: $storage"
Write-Host "Publish root: $publish"
