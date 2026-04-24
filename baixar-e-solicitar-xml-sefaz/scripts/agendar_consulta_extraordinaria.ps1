param(
    [string]$TaskName = "SEFAZ_Consulta_Extraordinaria_271219858_2025",
    [string]$Inscricao = "271219858",
    [string]$NomeEsperado = "P T C SANTOS INDUSTRIA E COMERCIO PEDRO THIAGO LTDA",
    [string]$DataInicial = "01/01/2025",
    [string]$DataFinal = "31/12/2025",
    [string]$LoteId = "retroativo_271219858_2025",
    [string]$Segmentacao = "mensal",
    [datetime]$ExecutarEm = [datetime]::Parse("2026-03-28 00:10:00")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host $Message -ForegroundColor Green
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptDir

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $python) {
    throw "Python nao encontrado no PATH."
}

$localDir = Join-Path $workspaceRoot "_local"
$tasksDir = Join-Path $localDir "tasks"
$logsDir = Join-Path $localDir "logs\extraordinario"
$wrapperPath = Join-Path $tasksDir "$TaskName.cmd"

New-Item -ItemType Directory -Force -Path $tasksDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$wrapperContent = @"
@echo off
setlocal
chcp 65001 >nul
set PYTHONIOENCODING=UTF-8
set PYTHONLEGACYWINDOWSSTDIO=utf-8
cd /d "$workspaceRoot"
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { `$ErrorActionPreference='Stop'; `$OutputEncoding=[System.Text.Encoding]::UTF8; `$env:PYTHONUNBUFFERED='1'; `$logDir='$logsDir'; New-Item -ItemType Directory -Force -Path `$logDir | Out-Null; `$timestamp=Get-Date -Format 'yyyyMMdd_HHmmss'; `$logFile=Join-Path `$logDir ('consulta_extraordinaria_' + `$timestamp + '.log'); & '$($python.Path)' -u 'scripts\executar_consulta_extraordinaria.py' '--inscricao' '$Inscricao' '--nome-esperado' '$NomeEsperado' '--data-inicial' '$DataInicial' '--data-final' '$DataFinal' '--lote-id' '$LoteId' '--segmentacao' '$Segmentacao' '--visible' 2>&1 | Tee-Object -FilePath `$logFile -Append; exit `$LASTEXITCODE }"
exit /b %ERRORLEVEL%
"@

Set-Content -Path $wrapperPath -Value $wrapperContent -Encoding ASCII
Write-Ok "[OK] Wrapper criado: $wrapperPath"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Info "[INFO] Tarefa anterior removida: $TaskName"
}

$trigger = New-ScheduledTaskTrigger -Once -At $ExecutarEm
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$wrapperPath`"" -WorkingDirectory $workspaceRoot
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Consulta extraordinaria de XMLs 2025 para a inscricao 271219858." | Out-Null

Write-Ok "[OK] Tarefa registrada com sucesso."
Write-Host "TaskName: $TaskName"
Write-Host "Executar em: $ExecutarEm"
Write-Host "WorkingDirectory: $workspaceRoot"
Write-Host "Wrapper: $wrapperPath"
Write-Host "Python: $($python.Path)"
Write-Host "LoteId: $LoteId"
