<#
.SYNOPSIS
  Pipeline: midia/transcricao -> Whisper local -> agente Cursor -> documentos POP/IT.

.DESCRIPTION
  1. Transcreve com transcribe_media.ps1 (faster-whisper / large-v3-turbo) se
     -MediaPath for informado, ou usa -TranscriptionPath ja existente.
  2. Monta brief a partir de flags ou videos/<nome>.json.
  3. Dispara run_agent_gerar.py (cursor-sdk) para montar content-v2.json e
     chamar build_documents.ps1.
  4. Em sucesso, move a transcricão de transcriptions/a fazer para feitos/.

  Sem CURSOR_API_KEY: para apos a transcricão e imprime o prompt para colar no Cursor.

.PARAMETER MediaPath
  Arquivo de audio/video (ou pasta).

.PARAMETER TranscriptionPath
  .txt/.md ja pronto; pula o STT.

.PARAMETER DocumentTypes
  Lista: pop, it, form, mp. Padrao: todos.

.PARAMETER Slug
  Pasta em output/. Se vazio, deriva do nome da midia/transcricao.

.PARAMETER BriefJson
  Sidecar JSON com metadados. Se vazio, tenta videos/<stem>.json.

.PARAMETER SkipAgent
  So transccreve (nao chama o agente).

.PARAMETER ForceTranscribe
  Forca novo STT mesmo com .txt existente.

.PARAMETER WhisperModel / Device / ComputeType / Language
  Encaminhados a transcribe_media.ps1.
#>
param(
  [string]$MediaPath = '',
  [string]$TranscriptionPath = '',
  [string[]]$DocumentTypes = @('pop', 'it', 'form', 'mp'),
  [string]$Slug = '',
  [string]$BriefJson = '',
  [string]$OutputRoot = '',
  [string]$Titulo = '',
  [string]$Setor = '',
  [string]$Sigla = '',
  [string]$CodigoPr = '',
  [string]$CodigoIn = '',
  [string]$CodigoForm = '',
  [string]$CodigoMp = '',
  [string]$Elaborador = '',
  [string]$Verificador = '',
  [string]$Aprovador = '',
  [string]$Sistema = '',
  [string]$RegistroSaida = '',
  [string]$Prazo = '',
  [string]$Executor = '',
  [string]$ComunicadorCliente = '',
  [string]$Observacoes = '',
  [string]$Model = 'composer-2.5',
  [string]$WhisperModel = 'large-v3-turbo',
  [ValidateSet('auto', 'cpu', 'cuda')]
  [string]$Device = 'auto',
  [string]$ComputeType = '',
  [string]$Language = 'pt',
  [switch]$SkipAgent,
  [switch]$ForceTranscribe,
  [switch]$KeepTranscriptInAFazer
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..')).Path
$transcribeScript = Join-Path $scriptDir 'transcribe_media.ps1'
$agentScript = Join-Path $scriptDir 'run_agent_gerar.py'
$pendingDir = Join-Path $projectRoot 'transcriptions\a fazer'
$doneDir = Join-Path $projectRoot 'transcriptions\feitos'

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $projectRoot 'output'
}

function Get-PythonCommand {
  $py = Get-Command python -ErrorAction SilentlyContinue
  if ($null -ne $py) { return @('python') }
  $launcher = Get-Command py -ErrorAction SilentlyContinue
  if ($null -ne $launcher) { return @('py', '-3') }
  throw "Python nao encontrado no PATH (tente 'python' ou 'py -3')."
}

function ConvertTo-Slug {
  param([string]$Name)
  $s = $Name.Trim().ToLowerInvariant()
  $s = [regex]::Replace($s, '\s*\(transcribed on .+\)\s*$', '')
  $s = [regex]::Replace($s, '[^a-z0-9]+', '-')
  $s = $s.Trim('-')
  if ([string]::IsNullOrWhiteSpace($s)) { $s = 'processo' }
  if ($s.Length -gt 80) { $s = $s.Substring(0, 80).Trim('-') }
  return $s
}

function Resolve-SidecarBrief {
  param(
    [string]$Media,
    [string]$Explicit
  )
  if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
    if (-not (Test-Path -LiteralPath $Explicit -PathType Leaf)) {
      throw "BriefJson nao encontrado: $Explicit"
    }
    return (Resolve-Path -LiteralPath $Explicit).Path
  }
  if ([string]::IsNullOrWhiteSpace($Media)) { return '' }
  if (-not (Test-Path -LiteralPath $Media)) { return '' }
  $item = Get-Item -LiteralPath $Media
  $stem = if ($item.PSIsContainer) { '' } else { [System.IO.Path]::GetFileNameWithoutExtension($item.Name) }
  if ([string]::IsNullOrWhiteSpace($stem)) { return '' }
  $candidate = Join-Path $item.DirectoryName ($stem + '.json')
  if (Test-Path -LiteralPath $candidate -PathType Leaf) {
    return (Resolve-Path -LiteralPath $candidate).Path
  }
  return ''
}

function Merge-BriefObject {
  param(
    [string]$SidecarPath
  )
  $obj = [ordered]@{}
  if (-not [string]::IsNullOrWhiteSpace($SidecarPath)) {
    $raw = Get-Content -LiteralPath $SidecarPath -Raw -Encoding UTF8
    $parsed = $raw | ConvertFrom-Json
    foreach ($p in $parsed.PSObject.Properties) {
      if ($null -ne $p.Value -and "$($p.Value)".Trim() -ne '') {
        $obj[$p.Name] = "$($p.Value)"
      }
    }
  }
  $map = @{
    titulo = $Titulo
    setor = $Setor
    sigla = $Sigla
    codigo_pr = $CodigoPr
    codigo_in = $CodigoIn
    codigo_form = $CodigoForm
    codigo_mp = $CodigoMp
    elaborador = $Elaborador
    verificador = $Verificador
    aprovador = $Aprovador
    sistema = $Sistema
    registro_saida = $RegistroSaida
    prazo = $Prazo
    executor = $Executor
    comunicador_cliente = $ComunicadorCliente
    observacoes = $Observacoes
  }
  foreach ($key in $map.Keys) {
    if (-not [string]::IsNullOrWhiteSpace($map[$key])) {
      $obj[$key] = $map[$key]
    }
  }
  return $obj
}

function Move-TranscriptToFeitos {
  param([string]$Path)
  if ($KeepTranscriptInAFazer) { return }
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }

  $full = (Resolve-Path -LiteralPath $Path).Path
  $pendingFull = [System.IO.Path]::GetFullPath($pendingDir)
  if (-not $full.StartsWith($pendingFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "[info] Transcricao fora de 'a fazer'; nao mover: $full"
    return
  }

  if (-not (Test-Path -LiteralPath $doneDir)) {
    New-Item -ItemType Directory -Path $doneDir -Force | Out-Null
  }
  $dest = Join-Path $doneDir ([System.IO.Path]::GetFileName($full))
  if (Test-Path -LiteralPath $dest) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $base = [System.IO.Path]::GetFileNameWithoutExtension($dest)
    $dest = Join-Path $doneDir "$base-$stamp.txt"
  }
  Move-Item -LiteralPath $full -Destination $dest -Force
  Write-Host "[ok] Transcricao movida para: $dest"
}

# --- 1) Resolver transcricão ---
$resolvedTranscript = ''
if (-not [string]::IsNullOrWhiteSpace($TranscriptionPath)) {
  if (-not (Test-Path -LiteralPath $TranscriptionPath -PathType Leaf)) {
    throw "TranscriptionPath nao encontrado: $TranscriptionPath"
  }
  $resolvedTranscript = (Resolve-Path -LiteralPath $TranscriptionPath).Path
  Write-Host "[info] Usando transcricão existente: $resolvedTranscript"
}
elseif (-not [string]::IsNullOrWhiteSpace($MediaPath)) {
  if (-not (Test-Path -LiteralPath $transcribeScript)) {
    throw "transcribe_media.ps1 nao encontrado: $transcribeScript"
  }
  $transcribeArgs = @{
    MediaPath = $MediaPath
    OutputDirectory = $pendingDir
    Model = $WhisperModel
    Device = $Device
    Language = $Language
  }
  if (-not [string]::IsNullOrWhiteSpace($ComputeType)) {
    $transcribeArgs['ComputeType'] = $ComputeType
  }
  if ($ForceTranscribe) {
    $transcribeArgs['Force'] = $true
  }

  Write-Host "[step] Transcrevendo com faster-whisper ($WhisperModel)..."
  $transcribeOutput = & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $transcribeScript @transcribeArgs 2>&1
  $transcribeOutput | ForEach-Object { Write-Host $_ }

  $jsonLine = $transcribeOutput | Where-Object { "$_" -like 'TRANSCRIBE_JSON:*' } | Select-Object -Last 1
  if ($null -eq $jsonLine) {
    throw "transcribe_media.ps1 nao retornou TRANSCRIBE_JSON."
  }
  $payload = ("$jsonLine" -replace '^TRANSCRIBE_JSON:', '') | ConvertFrom-Json
  if ($null -eq $payload.transcripts -or $payload.transcripts.Count -eq 0) {
    throw "Nenhuma transcricão produzida."
  }
  if ($payload.transcripts.Count -gt 1 -and [string]::IsNullOrWhiteSpace($Slug)) {
    throw "Varias midias transcricadas; informe -Slug e -TranscriptionPath para processar uma a uma, ou passe um unico -MediaPath arquivo."
  }
  $resolvedTranscript = [string]$payload.transcripts[0].transcript_path
  Write-Host "[ok] Transcricao: $resolvedTranscript"
}
else {
  throw "Informe -MediaPath (audio/video) ou -TranscriptionPath (.txt)."
}

# --- 2) Slug e brief ---
$stemForSlug = [System.IO.Path]::GetFileNameWithoutExtension($resolvedTranscript)
if ([string]::IsNullOrWhiteSpace($Slug)) {
  if (-not [string]::IsNullOrWhiteSpace($MediaPath) -and (Test-Path -LiteralPath $MediaPath -PathType Leaf)) {
    $stemForSlug = [System.IO.Path]::GetFileNameWithoutExtension($MediaPath)
  }
  $Slug = ConvertTo-Slug -Name $stemForSlug
}
Write-Host "[info] Slug: $Slug"

$sidecar = Resolve-SidecarBrief -Media $MediaPath -Explicit $BriefJson
$briefObj = Merge-BriefObject -SidecarPath $sidecar
$briefTemp = Join-Path $env:TEMP ("gerador-pop-it-brief-" + [guid]::NewGuid().ToString('N') + '.json')
($briefObj | ConvertTo-Json -Depth 5) | Set-Content -LiteralPath $briefTemp -Encoding UTF8

$docsCsv = ($DocumentTypes | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ }) -join ','
if ([string]::IsNullOrWhiteSpace($docsCsv)) { $docsCsv = 'pop,it,form,mp' }

if ($SkipAgent) {
  Write-Host "[done] SkipAgent: transcricão pronta em $resolvedTranscript"
  Write-Host "       Proximo: abra o Cursor e peca a geracao com a skill gerar-pop-it,"
  Write-Host "       ou rode sem -SkipAgent com CURSOR_API_KEY definida."
  Remove-Item -LiteralPath $briefTemp -Force -ErrorAction SilentlyContinue
  exit 0
}

# --- 3) Agente ---
$pyCmd = Get-PythonCommand
$hasKey = -not [string]::IsNullOrWhiteSpace($env:CURSOR_API_KEY)

$agentArgs = @(
  $agentScript,
  '--transcript', $resolvedTranscript,
  '--slug', $Slug,
  '--output-root', $OutputRoot,
  '--docs', $docsCsv,
  '--brief-json', $briefTemp,
  '--model', $Model
)

if (-not $hasKey) {
  Write-Host ""
  Write-Host "[aviso] CURSOR_API_KEY nao definida. Transcricao concluida; agente nao sera chamado." -ForegroundColor Yellow
  Write-Host "Cole o prompt abaixo no chat do Cursor (com a skill gerar-pop-it):"
  Write-Host "-----"
  & @pyCmd ($agentArgs + @('--print-prompt-only'))
  Write-Host "-----"
  Remove-Item -LiteralPath $briefTemp -Force -ErrorAction SilentlyContinue
  exit 0
}

Write-Host "[step] Disparando agente Cursor local..."
& @pyCmd @agentArgs
$agentExit = $LASTEXITCODE
Remove-Item -LiteralPath $briefTemp -Force -ErrorAction SilentlyContinue

if ($agentExit -ne 0) {
  throw "run_agent_gerar.py falhou (exit $agentExit)."
}

$contentJson = Join-Path $OutputRoot "$Slug\geracao\content-v2.json"
$docsDir = Join-Path $OutputRoot "$Slug\documentos"
if (-not (Test-Path -LiteralPath $contentJson -PathType Leaf)) {
  throw "Agente nao gerou content-v2.json em: $contentJson"
}

# --- 4) Mover transcricão se documentos existem ---
$hasDocs = $false
if (Test-Path -LiteralPath $docsDir) {
  $hasDocs = @(Get-ChildItem -LiteralPath $docsDir -File -ErrorAction SilentlyContinue).Count -gt 0
}
if ($hasDocs) {
  Move-TranscriptToFeitos -Path $resolvedTranscript
}
else {
  Write-Host "[aviso] Pasta documentos/ vazia ou ausente; transcricão permanece em a fazer." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Concluido ==="
Write-Host "JSON: $contentJson"
if ($hasDocs) { Write-Host "Documentos: $docsDir" }
Write-Host "Lembrete: prints da IT continuam manuais."
