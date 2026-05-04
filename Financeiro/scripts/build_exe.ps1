$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Python = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = "python"
}

$EnvFile = Join-Path $Root "config\.env"
if (-not (Test-Path $EnvFile)) {
    throw "Arquivo config\.env nao encontrado. Crie esse arquivo com APP_KEY e APP_SECRET antes de gerar o pacote."
}

$AppName = "Financeiro NFSe"
$DistRoot = Join-Path $Root "dist"
$AppDir = Join-Path $DistRoot $AppName
$BuildDir = Join-Path $Root "build\pyinstaller"

if (Test-Path $AppDir) {
    Remove-Item -LiteralPath $AppDir -Recurse -Force
}

& $Python -m PyInstaller `
    --noconfirm `
    --clean `
    --onedir `
    --windowed `
    --name $AppName `
    --distpath $DistRoot `
    --workpath $BuildDir `
    --specpath $BuildDir `
    --collect-all playwright `
    --hidden-import playwright.sync_api `
    --hidden-import pywinauto `
    (Join-Path $Root "renomear_notas_gui.py")

$ConfigOut = Join-Path $AppDir "config"
$SamplesOut = Join-Path $AppDir "samples"
$VarOut = Join-Path $AppDir "var"
New-Item -ItemType Directory -Force -Path $ConfigOut, $SamplesOut, $VarOut | Out-Null

Copy-Item -LiteralPath $EnvFile -Destination (Join-Path $ConfigOut ".env") -Force

$ConfigFile = Join-Path $Root "config\financeiro.ini"
$ConfigExample = Join-Path $Root "config\financeiro.ini.example"
if (Test-Path $ConfigFile) {
    Copy-Item -LiteralPath $ConfigFile -Destination (Join-Path $ConfigOut "financeiro.ini") -Force
} elseif (Test-Path $ConfigExample) {
    Copy-Item -LiteralPath $ConfigExample -Destination (Join-Path $ConfigOut "financeiro.ini") -Force
}

$SamplesDir = Join-Path $Root "samples"
if (Test-Path $SamplesDir) {
    Copy-Item -Path (Join-Path $SamplesDir "*") -Destination $SamplesOut -Recurse -Force
}

Write-Host ""
Write-Host "Pacote gerado em: $AppDir"
Write-Host "Abra: $(Join-Path $AppDir "$AppName.exe")"
Write-Host "Saidas e logs ficarao em: $VarOut"
