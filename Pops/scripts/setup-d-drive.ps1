# Configura pastas no disco D: para Auto-POP Hub e modelos Ollama.
# Execute na pasta Pops:  .\scripts\setup-d-drive.ps1
# Ou: bun run setup:d-drive

$ErrorActionPreference = "Stop"

$AppRoot = "D:\auto-pop-hub"
# Modelos Ollama precisam de NTFS (mmap). D: exFAT nao funciona — usar C:
$OllamaModels = "C:\ollama-models"

Write-Host "Auto-POP Hub - setup disco D:" -ForegroundColor Cyan

if (-not (Test-Path "D:\")) {
    Write-Error "Disco D: nao encontrado. Ajuste os caminhos em scripts/setup-d-drive.ps1"
}

$dirs = @(
    $AppRoot,
    "$AppRoot\uploads",
    "$AppRoot\outputs",
    "$AppRoot\redis"
)
# Nao criar pasta de modelos no D: — Ollama usa C:\ollama-models
$dirs += $OllamaModels

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Criado: $dir" -ForegroundColor Green
    } else {
        Write-Host "  Ja existe: $dir" -ForegroundColor DarkGray
    }
}

# Adiciona Ollama ao PATH do usuario se instalado em D:\Ollama
$ollamaBin = "D:\Ollama"
if ((Test-Path "$ollamaBin\ollama.exe") -and $env:Path -notlike "*$ollamaBin*") {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    [Environment]::SetEnvironmentVariable("Path", "$ollamaBin;$userPath", "User")
    $env:Path = "$ollamaBin;" + $env:Path
    Write-Host "  PATH atualizado com $ollamaBin" -ForegroundColor Green
}

$current = [Environment]::GetEnvironmentVariable("OLLAMA_MODELS", "User")
if ($current -ne $OllamaModels) {
    [Environment]::SetEnvironmentVariable("OLLAMA_MODELS", $OllamaModels, "User")
    $env:OLLAMA_MODELS = $OllamaModels
    Write-Host "  OLLAMA_MODELS = $OllamaModels (usuario)" -ForegroundColor Green
    Write-Host "  Reinicie o Ollama / abra novo terminal apos instalar modelos." -ForegroundColor Yellow
} else {
    Write-Host "  OLLAMA_MODELS ja configurado: $current" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. Feche e abra um NOVO PowerShell (para carregar OLLAMA_MODELS)"
Write-Host "  2. ollama pull llama3.2:3b"
Write-Host "  3. cd Pops"
Write-Host "  4. docker compose up -d"
Write-Host "  5. bun run dev"
Write-Host ""
Write-Host "Modelos ficarao em: $OllamaModels"
Write-Host "Dados do app ficarao em: $AppRoot"
