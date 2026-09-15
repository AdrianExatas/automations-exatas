# Configura as tarefas agendadas da automacao SEFAZ TS/Bun.

param(
    [string]$HoraDownload = "09:00",
    [string]$HoraConsulta = "08:30",
    [switch]$SkipRegister
)

$ErrorActionPreference = "Stop"

function Write-Info($Message) {
    Write-Output "[INFO] $Message"
}

function Write-Ok($Message) {
    Write-Output "[OK] $Message"
}

function Escape-SingleQuoted($Value) {
    return $Value.Replace("'", "''")
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptDir
$tsRoot = Join-Path $workspaceRoot "TS"
$scheduledDir = Join-Path $workspaceRoot "_local\scheduled"
$logDir = Join-Path $workspaceRoot "_local\logs\scheduled"
$downloadWrapper = Join-Path $scheduledDir "sefaz_ts_download_upload.ps1"
$consultaWrapper = Join-Path $scheduledDir "sefaz_ts_consulta.ps1"

if (-not (Test-Path $tsRoot)) {
    throw "Diretorio TS nao encontrado: $tsRoot"
}

$bunCommand = Get-Command bun -ErrorAction SilentlyContinue
if ($bunCommand) {
    $bunPath = $bunCommand.Source
} else {
    $bunPath = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"
}

if (-not (Test-Path $bunPath)) {
    throw "Bun nao encontrado. Instale o Bun ou adicione bun.exe ao PATH."
}

New-Item -ItemType Directory -Force -Path $scheduledDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$tsRootEscaped = Escape-SingleQuoted $tsRoot
$bunPathEscaped = Escape-SingleQuoted $bunPath
$logDirEscaped = Escape-SingleQuoted $logDir

$downloadWrapperContent = @"
`$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
`$OutputEncoding = [System.Text.Encoding]::UTF8
`$env:NO_COLOR = '1'
`$tsRoot = '$tsRootEscaped'
`$bun = '$bunPathEscaped'
`$logDir = '$logDirEscaped'
New-Item -ItemType Directory -Force -Path `$logDir | Out-Null
`$logFile = Join-Path `$logDir ('download_upload_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.log')
Set-Location `$tsRoot
Write-Output ('Iniciando Download/Upload SEFAZ TS - ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) | Tee-Object -FilePath `$logFile -Append
& `$bun run 'src-ts\cli\task.ts' 'download-upload' 2>&1 | Tee-Object -FilePath `$logFile -Append
`$exitCode = `$LASTEXITCODE
Write-Output ('Finalizado com codigo ' + `$exitCode + ' - ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) | Tee-Object -FilePath `$logFile -Append
exit `$exitCode
"@

$consultaWrapperContent = @"
`$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
`$OutputEncoding = [System.Text.Encoding]::UTF8
`$env:NO_COLOR = '1'
`$tsRoot = '$tsRootEscaped'
`$bun = '$bunPathEscaped'
`$logDir = '$logDirEscaped'
New-Item -ItemType Directory -Force -Path `$logDir | Out-Null
`$logFile = Join-Path `$logDir ('consulta_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.log')
Set-Location `$tsRoot
Write-Output ('Iniciando Consulta SEFAZ TS - ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) | Tee-Object -FilePath `$logFile -Append
& `$bun run 'src-ts\cli\task.ts' 'consulta' 2>&1 | Tee-Object -FilePath `$logFile -Append
`$exitCode = `$LASTEXITCODE
Write-Output ('Finalizado com codigo ' + `$exitCode + ' - ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) | Tee-Object -FilePath `$logFile -Append
exit `$exitCode
"@

Set-Content -Path $downloadWrapper -Value $downloadWrapperContent -Encoding UTF8
Set-Content -Path $consultaWrapper -Value $consultaWrapperContent -Encoding UTF8

Write-Ok "Wrapper download/upload atualizado: $downloadWrapper"
Write-Ok "Wrapper consulta atualizado: $consultaWrapper"

if ($SkipRegister) {
    Write-Info "Registro das tarefas ignorado por -SkipRegister."
    exit 0
}

$taskNameDownload = "SEFAZ XML - Download Upload"
$taskNameConsulta = "SEFAZ XML - Consulta"

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

$downloadAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$downloadWrapper`"" `
    -WorkingDirectory $tsRoot

$consultaAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$consultaWrapper`"" `
    -WorkingDirectory $tsRoot

$downloadTrigger = New-ScheduledTaskTrigger -Daily -At $HoraDownload
$consultaTrigger = New-ScheduledTaskTrigger -Daily -At $HoraConsulta

function Register-OrChangeTask($TaskName, $Action, $Trigger, $Description, $WrapperPath, $StartTime) {
    try {
        Register-ScheduledTask `
            -TaskName $TaskName `
            -Action $Action `
            -Trigger $Trigger `
            -Settings $settings `
            -Principal $principal `
            -Description $Description `
            -Force | Out-Null
        Write-Ok "Tarefa registrada: $TaskName"
    } catch {
        $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if (-not $existingTask) {
            throw
        }

        Write-Info "Registro completo falhou para $TaskName; tentando atualizar tarefa existente via schtasks."
        $taskRun = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$WrapperPath`""
        & schtasks.exe /Change /TN $TaskName /TR $taskRun /ST $StartTime | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao atualizar $TaskName via schtasks."
        }
        Write-Ok "Tarefa existente atualizada: $TaskName"
    }
}

Register-OrChangeTask `
    -TaskName $taskNameDownload `
    -Action $downloadAction `
    -Trigger $downloadTrigger `
    -Description "Baixa XMLs prontos da SEFAZ via TS/Bun e envia ao SIEG" `
    -WrapperPath $downloadWrapper `
    -StartTime $HoraDownload

Register-OrChangeTask `
    -TaskName $taskNameConsulta `
    -Action $consultaAction `
    -Trigger $consultaTrigger `
    -Description "Solicita novos XMLs na SEFAZ via TS/Bun para o proximo ciclo" `
    -WrapperPath $consultaWrapper `
    -StartTime $HoraConsulta

foreach ($legacyTask in @("SEFAZ_Download_XML", "SEFAZ_Consulta_XML")) {
    $task = Get-ScheduledTask -TaskName $legacyTask -ErrorAction SilentlyContinue
    if ($task) {
        if ($task.State -eq "Disabled") {
            Write-Info "Tarefa antiga ja esta desabilitada: $legacyTask"
            continue
        }
        try {
            Disable-ScheduledTask -TaskName $legacyTask | Out-Null
            Write-Info "Tarefa antiga mantida desabilitada: $legacyTask"
        } catch {
            Write-Info "Nao foi possivel desabilitar $legacyTask nesta sessao: $($_.Exception.Message)"
        }
    }
}

Write-Ok "Agenda final: $taskNameDownload diariamente as $HoraDownload"
Write-Ok "Agenda final: $taskNameConsulta diariamente as $HoraConsulta"
