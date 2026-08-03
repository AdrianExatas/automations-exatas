[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$VideoPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [string]$ResultJson = "",

  [ValidatePattern('^[a-z]{2,3}(-[A-Za-z0-9]+)?$')]
  [string]$Language = "pt",

  [ValidateRange(1, 64)]
  [int]$Threads = 0,

  [ValidateRange(1, 1000)]
  [int]$MinimumCharacters = 20,

  [string]$ModelPath = "",

  [switch]$Strict
)

$ErrorActionPreference = "Stop"

function Get-CanonicalPath([string]$PathValue) {
  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $PathValue))
}

function Test-IsWithin([string]$Candidate, [string]$Parent) {
  $candidateFull = Get-CanonicalPath $Candidate
  $parentFull = (Get-CanonicalPath $Parent).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
  $prefix = $parentFull + [System.IO.Path]::DirectorySeparatorChar
  return $candidateFull.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)
}

function Invoke-NativeCapture([string]$Executable, [string[]]$Arguments) {
  $previousErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $lines = @(& $Executable @Arguments 2>&1 | ForEach-Object { [string]$_ })
    $exitCode = $LASTEXITCODE
    return [ordered]@{
      exit_code = $exitCode
      text = (($lines -join [Environment]::NewLine).Trim())
    }
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
}

$skillRoot = [System.IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$ffmpegPath = Join-Path $skillRoot "vendor\ffmpeg\bin\ffmpeg.exe"
$ffprobePath = Join-Path $skillRoot "vendor\ffmpeg\bin\ffprobe.exe"
$whisperPath = Join-Path $skillRoot "vendor\whisper\bin\whisper-cli.exe"
$defaultModelPath = Join-Path $skillRoot "vendor\whisper\models\ggml-small-q5_1.bin"
$videoFile = Get-CanonicalPath $VideoPath
$transcriptFile = Get-CanonicalPath $OutputPath
$modelFile = $(if ($ModelPath.Trim().Length -gt 0) { Get-CanonicalPath $ModelPath } else { $defaultModelPath })
$resultFile = $(if ($ResultJson.Trim().Length -gt 0) { Get-CanonicalPath $ResultJson } else { $null })

$result = [ordered]@{
  schema_version = "1.0"
  status = "pending"
  pending_code = $null
  pending_reason = $null
  video = $videoFile
  language = $Language
  model = $modelFile
  transcript_path = $null
  characters = 0
}

$tempRoot = [System.IO.Path]::GetFullPath((Join-Path ([System.IO.Path]::GetTempPath()) "gerar-pop-it-transcription"))
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
$workspace = Join-Path $tempRoot ("transcription-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workspace | Out-Null

try {
  if (-not (Test-Path -LiteralPath $videoFile -PathType Leaf)) {
    throw "VIDEO_NOT_FOUND|Video not found: $videoFile"
  }
  if (-not (Test-Path -LiteralPath $ffmpegPath -PathType Leaf)) {
    throw "FFMPEG_NOT_FOUND|Bundled FFmpeg not found: $ffmpegPath"
  }
  if (-not (Test-Path -LiteralPath $ffprobePath -PathType Leaf)) {
    throw "FFPROBE_NOT_FOUND|Bundled ffprobe not found: $ffprobePath"
  }
  if (-not (Test-Path -LiteralPath $whisperPath -PathType Leaf)) {
    throw "WHISPER_NOT_FOUND|Bundled whisper.cpp CLI not found: $whisperPath"
  }
  if (-not (Test-Path -LiteralPath $modelFile -PathType Leaf)) {
    throw "MODEL_NOT_FOUND|Whisper model not found: $modelFile"
  }
  if (([System.IO.Path]::GetExtension($transcriptFile)).ToLowerInvariant() -ne ".txt") {
    throw "INVALID_OUTPUT|OutputPath must use the .txt extension."
  }
  if (Test-IsWithin $transcriptFile $skillRoot) {
    throw "INVALID_OUTPUT|Transcripts cannot be written inside the installed skill."
  }
  if ($null -ne $resultFile -and (Test-IsWithin $resultFile $skillRoot)) {
    throw "INVALID_RESULT_OUTPUT|ResultJson cannot be written inside the installed skill."
  }

  $audioProbeArgs = @(
    "-v", "error",
    "-select_streams", "a:0",
    "-show_entries", "stream=index,codec_name,sample_rate,channels",
    "-of", "json",
    $videoFile
  )
  $audioProbeResult = Invoke-NativeCapture $ffprobePath $audioProbeArgs
  if ($audioProbeResult.exit_code -ne 0) {
    throw "PROBE_FAILED|ffprobe could not inspect the audio stream: $($audioProbeResult.text)"
  }
  $audioProbe = $audioProbeResult.text | ConvertFrom-Json
  if (@($audioProbe.streams).Count -eq 0) {
    throw "NO_AUDIO_STREAM|The video has no audio stream. Review the process visually and record this validation point."
  }

  $wavPath = Join-Path $workspace "audio-16khz-mono.wav"
  $ffmpegArgs = @(
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", $videoFile,
    "-map", "0:a:0",
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-c:a", "pcm_s16le",
    $wavPath
  )
  $ffmpegResult = Invoke-NativeCapture $ffmpegPath $ffmpegArgs
  if ($ffmpegResult.exit_code -ne 0 -or -not (Test-Path -LiteralPath $wavPath -PathType Leaf)) {
    throw "AUDIO_CONVERSION_FAILED|FFmpeg could not convert the audio: $($ffmpegResult.text)"
  }

  if ($Threads -le 0) {
    $Threads = [Math]::Max(1, [Math]::Min(8, [Environment]::ProcessorCount - 1))
  }
  $temporaryPrefix = Join-Path $workspace "transcript"
  $whisperArgs = @(
    "-m", $modelFile,
    "-f", $wavPath,
    "-l", $Language,
    "-t", [string]$Threads,
    "-otxt",
    "-of", $temporaryPrefix,
    "-nt",
    "-np"
  )
  $whisperResult = Invoke-NativeCapture $whisperPath $whisperArgs
  $temporaryTranscript = $temporaryPrefix + ".txt"
  if ($whisperResult.exit_code -ne 0 -or -not (Test-Path -LiteralPath $temporaryTranscript -PathType Leaf)) {
    throw "TRANSCRIPTION_FAILED|whisper.cpp could not transcribe the audio: $($whisperResult.text)"
  }

  $transcript = (Get-Content -Raw -Encoding UTF8 -LiteralPath $temporaryTranscript).Trim()
  $meaningfulText = [System.Text.RegularExpressions.Regex]::Replace($transcript, "\s+", "")
  if ($meaningfulText.Length -lt $MinimumCharacters) {
    throw "TRANSCRIPTION_INCONCLUSIVE|The transcript is empty or too short for reliable use. Review the video and record this validation point."
  }

  $outputParent = Split-Path $transcriptFile -Parent
  if (-not (Test-Path -LiteralPath $outputParent -PathType Container)) {
    New-Item -ItemType Directory -Path $outputParent -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($transcriptFile, $transcript + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

  $result.status = "success"
  $result.transcript_path = $transcriptFile
  $result.characters = $transcript.Length
} catch {
  $message = [string]$_.Exception.Message
  $separator = $message.IndexOf("|")
  if ($separator -gt 0) {
    $result.pending_code = $message.Substring(0, $separator)
    $result.pending_reason = $message.Substring($separator + 1)
  } else {
    $result.pending_code = "UNEXPECTED_ERROR"
    $result.pending_reason = $message
  }
} finally {
  if (Test-Path -LiteralPath $workspace -PathType Container) {
    $workspaceFull = [System.IO.Path]::GetFullPath($workspace)
    $tempPrefix = $tempRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if ($workspaceFull.StartsWith($tempPrefix, [System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $workspaceFull) -match '^transcription-[0-9a-f]{32}$') {
      Remove-Item -LiteralPath $workspaceFull -Recurse -Force
    }
  }
}

$resultText = $result | ConvertTo-Json -Depth 5
if ($null -ne $resultFile) {
  $resultParent = Split-Path $resultFile -Parent
  if (-not (Test-Path -LiteralPath $resultParent -PathType Container)) {
    New-Item -ItemType Directory -Path $resultParent -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($resultFile, $resultText, (New-Object System.Text.UTF8Encoding($false)))
}
Write-Output $resultText

if ($Strict -and $result.status -ne "success") {
  exit 1
}
exit 0
