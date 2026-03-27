# Script PowerShell para configurar agendamento automático dos scripts SEFAZ
# Execute como Administrador

param(
    [string]$Tipo = "diario",
    [string]$DiaSemana = "segunda",
    [string]$HoraDownload = "09:00",
    [string]$HoraConsulta = "10:00"
)

# Cores para output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "=========================================="
Write-ColorOutput Green "Configurador de Agendamento SEFAZ"
Write-ColorOutput Green "Nova Estrutura Unificada"
Write-ColorOutput Green "=========================================="
Write-Output ""
Write-Output "Ordem de execucao:"
Write-Output "  1. DOWNLOAD ($HoraDownload) - Baixa XMLs ja prontos (rapido)"
Write-Output "  2. CONSULTA ($HoraConsulta) - Solicita novos XMLs (com recuperacao)"
Write-Output ""

# Verifica se está executando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-ColorOutput Red "ERRO: Este script precisa ser executado como Administrador!"
    Write-Output "Clique com botao direito e selecione 'Executar como administrador'"
    pause
    exit 1
}

# Detecta caminhos automaticamente
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptDir

# Novos caminhos da estrutura unificada
$CaminhoConsulta = Join-Path $workspaceRoot "scripts\executar_consulta.py"
$CaminhoDownload = Join-Path $workspaceRoot "scripts\executar_download.py"

# Verifica se os scripts existem
if (-not (Test-Path $CaminhoConsulta)) {
    Write-ColorOutput Red "ERRO: Script de consulta nao encontrado: $CaminhoConsulta"
    pause
    exit 1
}

if (-not (Test-Path $CaminhoDownload)) {
    Write-ColorOutput Red "ERRO: Script de download nao encontrado: $CaminhoDownload"
    pause
    exit 1
}

Write-ColorOutput Green "[OK] Scripts encontrados:"
Write-Output "  Consulta: $CaminhoConsulta"
Write-Output "  Download: $CaminhoDownload"
Write-Output ""

# Encontra Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $python) {
    Write-ColorOutput Red "ERRO: Python nao encontrado no PATH!"
    Write-Output "Instale Python e adicione ao PATH"
    pause
    exit 1
}

Write-Output "Python encontrado: $($python.Path)"
Write-Output ""

# Cria diretório de logs se não existir
$logsDir = Join-Path $env:USERPROFILE "logs\sefaz"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Output "Diretorio de logs criado: $logsDir"
}

# Cria scripts batch para execução
$tempDir = $env:TEMP
$batchConsulta = Join-Path $tempDir "sefaz_consulta.bat"
$batchDownload = Join-Path $tempDir "sefaz_download.bat"

# Script batch para consulta
$batchContentConsulta = @"
@echo off
chcp 65001 >nul
set PYTHONIOENCODING=UTF-8
set PYTHONLEGACYWINDOWSSTDIO=utf-8
cd /d "$workspaceRoot"
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set mydate=%%c%%a%%b
set logfile="$logsDir\consulta_%mydate%.log"
echo ========================================
echo Iniciando Consulta SEFAZ - Captura Continua
echo Logs: %logfile%
echo ========================================
powershell -Command "& { `$ErrorActionPreference='Continue'; `$OutputEncoding=[System.Text.Encoding]::UTF8; `$env:PYTHONUNBUFFERED='1'; & '$($python.Path)' -u 'scripts\executar_consulta.py' '--visible' 2>&1 | Tee-Object -FilePath %logfile% -Append }"
echo.
echo Execucao concluida.
exit /b 0
"@

Set-Content -Path $batchConsulta -Value $batchContentConsulta -Encoding ASCII
Write-Output "Script batch de consulta criado: $batchConsulta"

# Script batch para download
$batchContentDownload = @"
@echo off
chcp 65001 >nul
set PYTHONIOENCODING=UTF-8
set PYTHONLEGACYWINDOWSSTDIO=utf-8
cd /d "$workspaceRoot"
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set mydate=%%c%%a%%b
set logfile="$logsDir\download_%mydate%.log"
echo ========================================
echo Iniciando Download SEFAZ
echo Logs: %logfile%
echo ========================================
powershell -Command "& { `$ErrorActionPreference='Continue'; `$OutputEncoding=[System.Text.Encoding]::UTF8; `$env:PYTHONUNBUFFERED='1'; & '$($python.Path)' -u 'scripts\executar_download.py' '--visible' '--upload' 2>&1 | Tee-Object -FilePath %logfile% -Append }"
echo.
echo Execucao concluida.
exit /b 0
"@

Set-Content -Path $batchDownload -Value $batchContentDownload -Encoding ASCII
Write-Output "Script batch de download criado: $batchDownload"
Write-Output ""

# Remove tarefas existentes se houver
$taskNameConsulta = "SEFAZ_Consulta_XML"
$taskNameDownload = "SEFAZ_Download_XML"

if (Get-ScheduledTask -TaskName $taskNameConsulta -ErrorAction SilentlyContinue) {
    Write-Output "Removendo tarefa existente: $taskNameConsulta"
    Unregister-ScheduledTask -TaskName $taskNameConsulta -Confirm:$false
}

if (Get-ScheduledTask -TaskName $taskNameDownload -ErrorAction SilentlyContinue) {
    Write-Output "Removendo tarefa existente: $taskNameDownload"
    Unregister-ScheduledTask -TaskName $taskNameDownload -Confirm:$false
}

# Converte dia da semana
$diaSemanaMap = @{
    "domingo" = "Sunday"
    "segunda" = "Monday"
    "terca" = "Tuesday"
    "quarta" = "Wednesday"
    "quinta" = "Thursday"
    "sexta" = "Friday"
    "sabado" = "Saturday"
}

$diaSemanaIngles = $diaSemanaMap[$DiaSemana.ToLower()]
if (-not $diaSemanaIngles -and $Tipo -eq "semanal") {
    Write-ColorOutput Red "ERRO: Dia da semana invalido: $DiaSemana"
    Write-Output "Use: domingo, segunda, terca, quarta, quinta, sexta, sabado"
    pause
    exit 1
}

# Cria triggers baseado no tipo
$triggerDownload = $null
$triggerConsulta = $null

if ($Tipo -eq "semanal") {
    $triggerDownload = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $diaSemanaIngles -At $HoraDownload
    $triggerConsulta = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $diaSemanaIngles -At $HoraConsulta
} elseif ($Tipo -eq "diario") {
    $triggerDownload = New-ScheduledTaskTrigger -Daily -At $HoraDownload
    $triggerConsulta = New-ScheduledTaskTrigger -Daily -At $HoraConsulta
} elseif ($Tipo -eq "mensal") {
    $triggerDownload = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At $HoraDownload
    $triggerConsulta = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At $HoraConsulta
} else {
    Write-ColorOutput Red "ERRO: Tipo invalido: $Tipo"
    Write-Output "Use: semanal, diario, mensal"
    pause
    exit 1
}

# Cria ações
$actionConsulta = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batchConsulta`"" -WorkingDirectory $workspaceRoot
$actionDownload = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batchDownload`"" -WorkingDirectory $workspaceRoot

# Configurações da tarefa
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

# Principal
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# REGISTRA DOWNLOAD PRIMEIRO (09:00)
Register-ScheduledTask -TaskName $taskNameDownload -Action $actionDownload -Trigger $triggerDownload -Settings $settings -Principal $principal -Description "Baixa XMLs do SEFAZ automaticamente" | Out-Null
Write-ColorOutput Green "[OK] Tarefa de DOWNLOAD criada: $taskNameDownload"
Write-Output "   Agendada para: $Tipo as $HoraDownload"
Write-Output ""

# REGISTRA CONSULTA DEPOIS (10:00)
Register-ScheduledTask -TaskName $taskNameConsulta -Action $actionConsulta -Trigger $triggerConsulta -Settings $settings -Principal $principal -Description "Captura continua de XMLs com recuperacao automatica" | Out-Null
Write-ColorOutput Green "[OK] Tarefa de CONSULTA criada: $taskNameConsulta"
Write-Output "   Agendada para: $Tipo as $HoraConsulta"
Write-Output ""

Write-ColorOutput Green "=========================================="
Write-ColorOutput Green "Configuracao concluida!"
Write-ColorOutput Green "=========================================="
Write-Output ""
Write-Output "Para visualizar as tarefas:"
Write-Output "  - Abra 'Agendador de Tarefas' (taskschd.msc)"
Write-Output "  - Procure: $taskNameConsulta e $taskNameDownload"
Write-Output ""
Write-Output "Para executar manualmente agora:"
Write-Output "  schtasks /run /tn '$taskNameDownload'"
Write-Output "  schtasks /run /tn '$taskNameConsulta'"
Write-Output ""
Write-Output "Para remover as tarefas:"
Write-Output "  Unregister-ScheduledTask -TaskName '$taskNameConsulta' -Confirm:`$false"
Write-Output "  Unregister-ScheduledTask -TaskName '$taskNameDownload' -Confirm:`$false"
Write-Output ""
pause
