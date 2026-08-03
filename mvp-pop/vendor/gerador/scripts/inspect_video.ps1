[CmdletBinding(DefaultParameterSetName = "Inspect")]
param(
  [Parameter(Mandatory = $true, ParameterSetName = "Inspect")]
  [string]$VideoPath,

  [Parameter(ParameterSetName = "Inspect")]
  [string]$OutputJson = "",

  [Parameter(ParameterSetName = "Inspect")]
  [ValidateRange(1, 60)]
  [int]$MaxFrames = 24,

  [Parameter(ParameterSetName = "Inspect")]
  [ValidateRange(0, 3600)]
  [double]$SampleIntervalSeconds = 0,

  [Parameter(ParameterSetName = "Inspect")]
  [switch]$MetadataOnly,

  [Parameter(ParameterSetName = "Inspect")]
  [switch]$KeepWorkspace,

  [Parameter(Mandatory = $true, ParameterSetName = "Cleanup")]
  [string]$CleanupWorkspace
)

$ErrorActionPreference = "Stop"

function Get-CanonicalPath([string]$PathValue) {
  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $PathValue))
}

function Get-InspectionTempRoot {
  return [System.IO.Path]::GetFullPath((Join-Path ([System.IO.Path]::GetTempPath()) "gerar-pop-it-inspection"))
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

function Remove-InspectionWorkspace([string]$Workspace) {
  $tempRoot = Get-InspectionTempRoot
  $target = Get-CanonicalPath $Workspace
  $prefix = $tempRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  if (-not $target.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Cleanup refused: the path is outside the inspection temp root."
  }
  if ((Split-Path -Leaf $target) -notmatch '^inspection-[0-9a-f]{32}$') {
    throw "Cleanup refused: unexpected workspace name."
  }
  if (-not (Test-Path -LiteralPath (Join-Path $target ".gerar-pop-it-inspection") -PathType Leaf)) {
    throw "Cleanup refused: workspace marker not found."
  }
  Remove-Item -LiteralPath $target -Recurse -Force
  Write-Output "Temporary inspection workspace removed: $target"
}

if ($PSCmdlet.ParameterSetName -eq "Cleanup") {
  Remove-InspectionWorkspace $CleanupWorkspace
  exit 0
}

$skillRoot = [System.IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$ffmpegPath = Join-Path $skillRoot "vendor\ffmpeg\bin\ffmpeg.exe"
$ffprobePath = Join-Path $skillRoot "vendor\ffmpeg\bin\ffprobe.exe"
$videoFile = Get-CanonicalPath $VideoPath

if (-not (Test-Path -LiteralPath $videoFile -PathType Leaf)) {
  throw "Video not found: $videoFile"
}
if (-not (Test-Path -LiteralPath $ffmpegPath -PathType Leaf)) {
  throw "Bundled FFmpeg not found: $ffmpegPath"
}
if (-not (Test-Path -LiteralPath $ffprobePath -PathType Leaf)) {
  throw "Bundled ffprobe not found: $ffprobePath"
}

$tempRoot = Get-InspectionTempRoot
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
$workspace = Join-Path $tempRoot ("inspection-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workspace | Out-Null
[System.IO.File]::WriteAllText(
  (Join-Path $workspace ".gerar-pop-it-inspection"),
  "Temporary files. Safe to remove with inspect_video.ps1 -CleanupWorkspace.",
  (New-Object System.Text.UTF8Encoding($false))
)

$completed = $false
try {
  $probeArgs = @(
    "-v", "error",
    "-show_entries", "format=duration,format_name,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
    "-of", "json",
    $videoFile
  )
  $probeResult = Invoke-NativeCapture $ffprobePath $probeArgs
  if ($probeResult.exit_code -ne 0) {
    throw "ffprobe failed: $($probeResult.text)"
  }
  $probe = $probeResult.text | ConvertFrom-Json
  $videoStreams = @($probe.streams | Where-Object { $_.codec_type -eq "video" })
  $audioStreams = @($probe.streams | Where-Object { $_.codec_type -eq "audio" })
  $duration = 0.0
  if ($null -ne $probe.format -and $null -ne $probe.format.duration) {
    $duration = [double]$probe.format.duration
  }

  $frameItems = @()
  $contactSheet = $null
  if (-not $MetadataOnly -and $videoStreams.Count -gt 0) {
    $interval = $SampleIntervalSeconds
    if ($interval -le 0) {
      if ($duration -gt 0) {
        $interval = [Math]::Max(1.0, [Math]::Ceiling($duration / [double]$MaxFrames))
      } else {
        $interval = 30.0
      }
    }
    $intervalText = $interval.ToString("0.###", [System.Globalization.CultureInfo]::InvariantCulture)
    $framePattern = Join-Path $workspace "frame-%03d.jpg"
    $frameArgs = @(
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", $videoFile,
      "-vf", ("fps=1/" + $intervalText + ",scale=960:-2"),
      "-frames:v", [string]$MaxFrames,
      "-q:v", "3",
      $framePattern
    )
    $frameResult = Invoke-NativeCapture $ffmpegPath $frameArgs
    if ($frameResult.exit_code -ne 0) {
      throw "FFmpeg frame sampling failed: $($frameResult.text)"
    }

    $frameFiles = @(Get-ChildItem -LiteralPath $workspace -Filter "frame-*.jpg" -File | Sort-Object Name)
    for ($index = 0; $index -lt $frameFiles.Count; $index++) {
      $frameItems += [ordered]@{
        index = $index + 1
        approximate_timestamp_seconds = [Math]::Round(($index * $interval), 3)
        path = $frameFiles[$index].FullName
      }
    }

    if ($frameFiles.Count -gt 0) {
      $contactSheet = Join-Path $workspace "contact-sheet.jpg"
      $tileRows = [Math]::Ceiling($frameFiles.Count / 4.0)
      $tileFilter = "scale=480:-2,tile=4x$tileRows`:padding=4:margin=4"
      $tileArgs = @(
        "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "1",
        "-start_number", "1",
        "-i", $framePattern,
        "-vf", $tileFilter,
        "-frames:v", "1",
        $contactSheet
      )
      $tileResult = Invoke-NativeCapture $ffmpegPath $tileArgs
      if ($tileResult.exit_code -ne 0) {
        throw "FFmpeg contact sheet generation failed: $($tileResult.text)"
      }
    }
  }

  $manifest = [ordered]@{
    schema_version = "1.0"
    video = $videoFile
    duration_seconds = [Math]::Round($duration, 3)
    format = $probe.format
    video_streams = $videoStreams
    audio_streams = $audioStreams
    sample_count = $frameItems.Count
    workspace_is_temporary = $true
    workspace_path = $(if ($KeepWorkspace) { $workspace } else { $null })
    contact_sheet = $(if ($KeepWorkspace) { $contactSheet } else { $null })
    frames = $(if ($KeepWorkspace) { $frameItems } else { @() })
    cleanup_required = [bool]$KeepWorkspace
    cleanup_command = $(if ($KeepWorkspace) { "powershell -File `"$PSCommandPath`" -CleanupWorkspace `"$workspace`"" } else { $null })
  }
  $json = $manifest | ConvertTo-Json -Depth 8

  if ($OutputJson.Trim().Length -gt 0) {
    $jsonPath = Get-CanonicalPath $OutputJson
    $jsonParent = Split-Path $jsonPath -Parent
    if (-not (Test-Path -LiteralPath $jsonParent -PathType Container)) {
      New-Item -ItemType Directory -Path $jsonParent -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($jsonPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  }
  Write-Output $json
  $completed = $true
} finally {
  if ((-not $KeepWorkspace) -or (-not $completed)) {
    if (Test-Path -LiteralPath $workspace -PathType Container) {
      Remove-InspectionWorkspace $workspace | Out-Null
    }
  }
}
