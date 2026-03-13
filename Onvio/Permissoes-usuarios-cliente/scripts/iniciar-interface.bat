@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   ONVIO - Automacao de Usuarios
echo   Iniciando Interface Electron...
echo ========================================
echo.

REM Verificar se node_modules existe
if not exist "node_modules\" (
    echo [AVISO] Dependencias nao instaladas. Instalando...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias
        pause
        exit /b 1
    )
    echo.
)

REM Verificar se Electron esta instalado
call npm list electron >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Electron nao encontrado. Instalando...
    call npm install electron --save-dev
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar Electron
        pause
        exit /b 1
    )
    echo.
)

REM Verificar se Playwright esta instalado
call npm list @playwright/test >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Playwright nao encontrado. Instalando navegadores...
    call npx playwright install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar Playwright
        pause
        exit /b 1
    )
    echo.
)

echo [OK] Iniciando interface...
echo.
call npm start

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao iniciar a interface
    pause
    exit /b 1
)

pause
