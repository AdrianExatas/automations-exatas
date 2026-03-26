@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   ONVIO - Instalar Dependencias
echo ========================================
echo.

echo [1/3] Instalando dependencias do npm...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias npm
    pause
    exit /b 1
)
echo [OK] Dependencias npm instaladas
echo.

echo [2/3] Instalando navegadores do Playwright...
call npx playwright install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar navegadores do Playwright
    pause
    exit /b 1
)
echo [OK] Navegadores do Playwright instalados
echo.

echo [3/3] Verificando instalacao do Electron...
call npm list electron >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Electron nao encontrado. Instalando...
    call npm install electron --save-dev
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar Electron
        pause
        exit /b 1
    )
    echo [OK] Electron instalado
) else (
    echo [OK] Electron ja esta instalado
)
echo.

echo ========================================
echo   Instalacao concluida com sucesso!
echo ========================================
echo.
echo Voce pode agora:
echo   - Executar "scripts\iniciar-interface.bat" para usar a interface grafica
echo   - Executar "scripts\executar-automacao.bat" para rodar via linha de comando
echo.

pause
