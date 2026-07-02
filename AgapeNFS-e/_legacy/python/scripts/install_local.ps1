$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ExeSource = Join-Path $ProjectRoot "dist\AgapeNFSeXML.exe"
$InstallDir = Join-Path $env:LOCALAPPDATA "AgapeNFSeXML"
$ExeDest = Join-Path $InstallDir "AgapeNFSeXML.exe"
$EnvExample = Join-Path $ProjectRoot ".env.example"
$ShortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Agape NFS-e XML.lnk"

if (-not (Test-Path $ExeSource)) {
    & (Join-Path $PSScriptRoot "build_exe.ps1")
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Force -Path $ExeSource -Destination $ExeDest

if ((Test-Path $EnvExample) -and -not (Test-Path (Join-Path $InstallDir ".env.example"))) {
    Copy-Item -Path $EnvExample -Destination (Join-Path $InstallDir ".env.example")
}

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ExeDest
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Agape NFS-e - Download XML"
$Shortcut.Save()

Write-Host ""
Write-Host "[OK] Instalado em: $InstallDir"
Write-Host "[OK] Atalho criado em: $ShortcutPath"
