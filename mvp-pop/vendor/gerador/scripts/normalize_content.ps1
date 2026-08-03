param(
  [Parameter(Mandatory=$true)][string]$ContentJson,
  [Parameter(Mandatory=$true)][string]$OutputJson
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$normalized = Read-NormalizedContent $ContentJson
$target = Get-FullPath $OutputJson
$parent = Split-Path -Parent $target
if (-not (Test-Path -LiteralPath $parent)) {
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
}
$json = $normalized | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($target, $json, (New-Object System.Text.UTF8Encoding($true)))
Write-Output $target
