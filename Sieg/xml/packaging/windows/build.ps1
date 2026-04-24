param(
    [string]$MachineEnvPath = "",
    [string]$IsccPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$PackageConfigDir = Join-Path $ProjectRoot "packaging\windows\config"
$PackagedEnvPath = Join-Path $PackageConfigDir ".env"
$SpecPath = Join-Path $ProjectRoot "packaging\windows\sieg_xml_desktop.spec"
$InstallerScript = Join-Path $ProjectRoot "packaging\windows\installer.iss"

if ($MachineEnvPath) {
    Copy-Item -LiteralPath $MachineEnvPath -Destination $PackagedEnvPath -Force
}

if (-not (Test-Path -LiteralPath $PackagedEnvPath)) {
    throw "Arquivo de configuracao nao encontrado em '$PackagedEnvPath'. Crie-o a partir de packaging\windows\config\.env.example."
}

python -m pip install -e ".[build]"
python -m PyInstaller $SpecPath --noconfirm --clean

if (-not $IsccPath) {
    $DefaultIscc = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"
    if (Test-Path -LiteralPath $DefaultIscc) {
        $IsccPath = $DefaultIscc
    }
}

if (-not $IsccPath -or -not (Test-Path -LiteralPath $IsccPath)) {
    throw "ISCC.exe nao encontrado. Informe -IsccPath ou instale o Inno Setup 6."
}

& $IsccPath $InstallerScript
