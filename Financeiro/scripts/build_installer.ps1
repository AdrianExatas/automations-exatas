$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Python = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = "python"
}

$AppName = "Financeiro NFSe"
$SetupName = "Financeiro NFSe Setup"
$DistRoot = Join-Path $Root "dist"
$AppDir = Join-Path $DistRoot $AppName
$InstallerBuildDir = Join-Path $Root "build\installer"
$InstallerWorkDir = Join-Path $InstallerBuildDir "pyinstaller"
$SetupStageDir = Join-Path $InstallerBuildDir "dist"
$SetupStagePath = Join-Path $SetupStageDir "$SetupName.exe"
$PayloadPath = Join-Path $InstallerBuildDir "payload.zip"
$SetupPath = Join-Path $DistRoot "$SetupName.exe"

& (Join-Path $PSScriptRoot "build_exe.ps1")

if (Test-Path $InstallerBuildDir) {
    Remove-Item -LiteralPath $InstallerBuildDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $InstallerBuildDir, $InstallerWorkDir, $SetupStageDir | Out-Null

if (Test-Path $PayloadPath) {
    Remove-Item -LiteralPath $PayloadPath -Force
}

$PayloadCreated = $false
for ($Attempt = 1; $Attempt -le 5; $Attempt++) {
    try {
        if (Test-Path $PayloadPath) {
            Remove-Item -LiteralPath $PayloadPath -Force
        }
        Compress-Archive -LiteralPath $AppDir -DestinationPath $PayloadPath -CompressionLevel Optimal -ErrorAction Stop
        $PayloadCreated = $true
        break
    } catch {
        if ($Attempt -eq 5) {
            throw
        }
        Start-Sleep -Seconds 2
    }
}

if (-not $PayloadCreated -or -not (Test-Path $PayloadPath)) {
    throw "Falha ao gerar payload do instalador: $PayloadPath"
}

if (Test-Path $SetupPath) {
    Remove-Item -LiteralPath $SetupPath -Force
}

& $Python -m PyInstaller `
    --noconfirm `
    --clean `
    --onefile `
    --windowed `
    --name $SetupName `
    --distpath $SetupStageDir `
    --workpath $InstallerWorkDir `
    --specpath $InstallerWorkDir `
    --add-data "$PayloadPath;." `
    (Join-Path $PSScriptRoot "windows_installer.py")

$SetupCopied = $false
for ($Attempt = 1; $Attempt -le 10; $Attempt++) {
    try {
        if (Test-Path $SetupPath) {
            Remove-Item -LiteralPath $SetupPath -Force -ErrorAction Stop
        }
        Copy-Item -LiteralPath $SetupStagePath -Destination $SetupPath -Force -ErrorAction Stop
        $SetupCopied = $true
        break
    } catch {
        if ($Attempt -eq 10) {
            throw
        }
        Start-Sleep -Seconds 2
    }
}

if (-not $SetupCopied -or -not (Test-Path $SetupPath)) {
    throw "Falha ao copiar instalador para: $SetupPath"
}

$SelfTestPassed = $false
for ($Attempt = 1; $Attempt -le 10; $Attempt++) {
    try {
        $Process = Start-Process -FilePath $SetupPath -ArgumentList "--self-test" -Wait -PassThru -WindowStyle Hidden -ErrorAction Stop
        if ($Process.ExitCode -ne 0) {
            throw "Self-test do instalador retornou codigo $($Process.ExitCode)."
        }
        $SelfTestPassed = $true
        break
    } catch {
        if ($Attempt -eq 10) {
            throw
        }
        Start-Sleep -Seconds 2
    }
}

if (-not $SelfTestPassed) {
    throw "Falha ao validar instalador: $SetupPath"
}

Write-Host ""
Write-Host "Instalador gerado em: $SetupPath"
