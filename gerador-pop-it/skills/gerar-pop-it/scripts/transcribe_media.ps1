<#
.SYNOPSIS
  Transcreve audio/video com faster-whisper (large-v3-turbo) via Python.

.DESCRIPTION
  Wrapper de transcribe_media.py. Nao depende do Buzz.
  Grava .txt em transcriptions/a fazer no padrao
  "{titulo} (transcribed on DD-Mon-YYYY HH-MM-SS).txt".

.PARAMETER MediaPath
  Arquivo ou pasta. Padrao: videos/ na raiz do projeto.

.PARAMETER OutputDirectory
  Destino dos .txt. Padrao: transcriptions/a fazer.

.PARAMETER Model
  Nome do modelo faster-whisper. Padrao: large-v3-turbo.

.PARAMETER Device
  auto | cpu | cuda. Padrao: auto.

.PARAMETER ComputeType
  Override (int8, float16, int8_float16...). Vazio = escolha automatica.

.PARAMETER Language
  Codigo de idioma. Padrao: pt.

.PARAMETER Prompt
  Initial prompt extra para o Whisper (alem do glossario Exatas).

.PARAMETER Glossary
  Caminho do glossario JSON. Vazio = padrao Exatas.

.PARAMETER NoGlossary
  Desliga prompt e pos-correcao do glossario.

.PARAMETER Force
  Forca nova transcricão mesmo se .txt correspondente existir.

.PARAMETER Watch
  Monitora a pasta de midia e transccreve novos arquivos.
#>
param(
  [string]$MediaPath = '',
  [string]$OutputDirectory = '',
  [string]$Model = 'large-v3-turbo',
  [ValidateSet('auto', 'cpu', 'cuda')]
  [string]$Device = 'auto',
  [string]$ComputeType = '',
  [string]$Language = 'pt',
  [string]$Prompt = '',
  [string]$Glossary = '',
  [int]$BeamSize = 5,
  [switch]$NoVad,
  [switch]$NoGlossary,
  [switch]$Force,
  [switch]$Watch
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path
$pyScript = Join-Path $scriptDir 'transcribe_media.py'

if (-not (Test-Path -LiteralPath $pyScript -PathType Leaf)) {
  throw "transcribe_media.py nao encontrado: $pyScript"
}

function Get-PythonCommand {
  $py = Get-Command python -ErrorAction SilentlyContinue
  if ($null -ne $py) { return @('python') }
  $launcher = Get-Command py -ErrorAction SilentlyContinue
  if ($null -ne $launcher) { return @('py', '-3') }
  throw "Python nao encontrado no PATH (tente 'python' ou 'py -3')."
}

if ([string]::IsNullOrWhiteSpace($MediaPath)) {
  $MediaPath = Join-Path $projectRoot 'videos'
}
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $projectRoot 'transcriptions\a fazer'
}

$pyCmd = Get-PythonCommand
$argv = @(
  $pyScript,
  '--media', $MediaPath,
  '--output-dir', $OutputDirectory,
  '--model', $Model,
  '--device', $Device,
  '--language', $Language,
  '--beam-size', "$BeamSize"
)

if (-not [string]::IsNullOrWhiteSpace($ComputeType)) {
  $argv += @('--compute-type', $ComputeType)
}
if (-not [string]::IsNullOrWhiteSpace($Prompt)) {
  $argv += @('--prompt', $Prompt)
}
if (-not [string]::IsNullOrWhiteSpace($Glossary)) {
  $argv += @('--glossary', $Glossary)
}
if ($NoGlossary) { $argv += '--no-glossary' }
if ($NoVad) { $argv += '--no-vad' }
if ($Force) { $argv += '--force' }
if ($Watch) { $argv += '--watch' }

Write-Host "[info] Python STT (faster-whisper): $Model"
& @pyCmd @argv
if ($LASTEXITCODE -ne 0) {
  throw "transcribe_media.py falhou (exit $LASTEXITCODE)."
}
