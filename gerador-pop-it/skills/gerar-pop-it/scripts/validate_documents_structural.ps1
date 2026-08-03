param(
  [Parameter(Mandatory = $true)][string]$ContentJson,
  [Parameter(Mandatory = $true)][string]$OutputDir,
  [string[]]$DocumentTypes = @(),
  [string]$ReportPath = ''
)

$ErrorActionPreference = 'Stop'
$python = Get-Command python -ErrorAction SilentlyContinue
if ($null -eq $python) {
  $python = Get-Command py -ErrorAction SilentlyContinue
}
if ($null -eq $python) {
  throw 'Python não encontrado. O validador estrutural requer Python 3.'
}

$script = Join-Path $PSScriptRoot 'validate_documents_structural.py'
$arguments = @(
  $script,
  '--content-json', (Resolve-Path -LiteralPath $ContentJson).Path,
  '--output-dir', (Resolve-Path -LiteralPath $OutputDir).Path
)
if ($DocumentTypes.Count -gt 0) {
  $arguments += @('--document-types', ($DocumentTypes -join ','))
}
if (-not [string]::IsNullOrWhiteSpace($ReportPath)) {
  $arguments += @('--report-path', $ReportPath)
}

& $python.Source @arguments
exit $LASTEXITCODE
