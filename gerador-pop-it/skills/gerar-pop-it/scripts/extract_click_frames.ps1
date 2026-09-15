<#
.SYNOPSIS
  Extrai prints de cliques de um video de gravacao de tela (com circulo).
  Preferencialmente guiado pela transcricão (timestamps + OCR).

.NOTES
  ARQUIVADO: feature fora do fluxo ativo. Ver archive/captura-prints/README.md.

.PARAMETER VideoPath
  Caminho do .mkv/.mp4/.webm.

.PARAMETER OutputDir
  Pasta de saida. Padrao: output/prints/<stem>/.

.PARAMETER TranscriptPath
  Caminho do .txt de transcricão ou do .segments.json.
  Ativa o modo guiado pela fala (requer sidecar .segments.json ao lado do .txt).

.PARAMETER MinGap
  Intervalo minimo entre prints no modo legado (segundos).

.PARAMETER MaxFrames
  Limite de prints.

.PARAMETER NoAnnotate
  Nao desenha o circulo de clique.

.PARAMETER NoClean
  Nao grava pasta clean/ sem marca.
#>
param(
  [Parameter(Mandatory = $true)][string]$VideoPath,
  [string]$OutputDir = '',
  [string]$TranscriptPath = '',
  [double]$MinGap = 1.2,
  [double]$StillSec = 0.25,
  [double]$LookAheadSec = 0.45,
  [double]$LocalThr = 8.0,
  [int]$MaxFrames = 30,
  [double]$PrePad = 0.3,
  [double]$PostPad = 1.5,
  [double]$SampleFps = 4.0,
  [switch]$NoAnnotate,
  [switch]$NoClean
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$pyScript = Join-Path $scriptDir 'extract_click_frames.py'
if (-not (Test-Path -LiteralPath $pyScript)) {
  throw "extract_click_frames.py nao encontrado: $pyScript"
}

function Get-PythonCommand {
  # Preferir 3.12: rapidocr-onnxruntime nao publica wheel para 3.13+/3.14.
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { return @($c) }
  }
  $py = Get-Command python -ErrorAction SilentlyContinue
  if ($null -ne $py) { return @('python') }
  $launcher = Get-Command py -ErrorAction SilentlyContinue
  if ($null -ne $launcher) { return @('py', '-3.12') }
  throw "Python nao encontrado no PATH."
}

$pyCmd = Get-PythonCommand
$argv = @(
  $pyScript,
  '--video', $VideoPath,
  '--min-gap', "$MinGap",
  '--still-sec', "$StillSec",
  '--look-ahead-sec', "$LookAheadSec",
  '--local-thr', "$LocalThr",
  '--max-frames', "$MaxFrames",
  '--pre-pad', "$PrePad",
  '--post-pad', "$PostPad",
  '--sample-fps', "$SampleFps"
)
if (-not [string]::IsNullOrWhiteSpace($OutputDir)) {
  $argv += @('--output-dir', $OutputDir)
}
if (-not [string]::IsNullOrWhiteSpace($TranscriptPath)) {
  $argv += @('--transcript', $TranscriptPath)
}
if ($NoAnnotate) { $argv += '--no-annotate' }
if ($NoClean) { $argv += '--no-clean' }

Write-Host "[info] Extraindo prints de: $VideoPath"
if (-not [string]::IsNullOrWhiteSpace($TranscriptPath)) {
  Write-Host "[info] Transcricão: $TranscriptPath"
}
& @pyCmd @argv
if ($LASTEXITCODE -ne 0) {
  throw "extract_click_frames.py falhou (exit $LASTEXITCODE)."
}
