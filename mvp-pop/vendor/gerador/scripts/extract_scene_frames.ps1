param(
  [Parameter(Mandatory = $true)][string]$VideoPath,
  [Parameter(Mandatory = $true)][string]$OutputDir,
  [Parameter(Mandatory = $true)][string]$TimestampsJson,
  [double]$SceneThreshold = 0.35
)

$ErrorActionPreference = "Stop"
$skillRoot = [System.IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$ffmpeg = Join-Path $skillRoot "vendor\ffmpeg\bin\ffmpeg.exe"
$ffprobe = Join-Path $skillRoot "vendor\ffmpeg\bin\ffprobe.exe"

if (-not (Test-Path $ffmpeg)) { throw "ffmpeg não encontrado: $ffmpeg" }

$video = [System.IO.Path]::GetFullPath($VideoPath)
$outDir = [System.IO.Path]::GetFullPath($OutputDir)
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$timestamps = @()
if (Test-Path $TimestampsJson) {
  $parsed = Get-Content -LiteralPath $TimestampsJson -Raw | ConvertFrom-Json
  if ($parsed.prints) {
    foreach ($p in $parsed.prints) {
      $timestamps += [ordered]@{
        etapa_id = [string]$p.etapa_id
        seconds = [double]$p.timestamp_seconds
        rotulo = [string]$p.rotulo
      }
    }
  }
}

if ($timestamps.Count -eq 0) {
  # fallback: scene detect first 12 cuts
  $sceneLog = Join-Path $outDir "scenes.log"
  & $ffmpeg -hide_banner -i $video -filter_complex "select='gt(scene,$SceneThreshold)',showinfo" -f null - 2> $sceneLog | Out-Null
  $seconds = @()
  Get-Content $sceneLog | ForEach-Object {
    if ($_ -match 'pts_time:([0-9.]+)') { $seconds += [double]$Matches[1] }
  }
  $i = 1
  foreach ($s in ($seconds | Select-Object -First 12)) {
    $timestamps += [ordered]@{ etapa_id = ('E{0:D2}' -f $i); seconds = $s; rotulo = "Cena $i" }
    $i++
  }
}

$manifest = New-Object System.Collections.Generic.List[object]
$idx = 1
foreach ($t in $timestamps) {
  $name = ('Print-{0:D2}-{1}.jpg' -f $idx, ($t.etapa_id -replace '[^A-Za-z0-9_-]', ''))
  $path = Join-Path $outDir $name
  $ss = [Math]::Max(0, [double]$t.seconds)
  & $ffmpeg -hide_banner -y -ss $ss -i $video -frames:v 1 -q:v 2 $path 2>$null | Out-Null
  if (Test-Path $path) {
    $manifest.Add([ordered]@{
      etapa_id = $t.etapa_id
      seconds = $ss
      rotulo = $t.rotulo
      path = $path
      needs_pii_review = $true
    })
  }
  $idx++
}

$manifestPath = Join-Path $outDir "prints-manifest.json"
($manifest | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Output $manifestPath
