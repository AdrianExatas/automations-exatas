@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   Testando Sintaxe dos Arquivos
echo ========================================
echo.

echo [1/4] Testando automation-runner.js...
node -c src\electron\automation-runner.js
if %errorlevel% neq 0 (
    echo [ERRO] Erro de sintaxe em automation-runner.js
    pause
    exit /b 1
) else (
    echo [OK] automation-runner.js - Sintaxe valida
)
echo.

echo [2/4] Testando main.js...
node -c src\electron\main.js
if %errorlevel% neq 0 (
    echo [ERRO] Erro de sintaxe em main.js
    pause
    exit /b 1
) else (
    echo [OK] main.js - Sintaxe valida
)
echo.

echo [3/4] Testando preload.js...
node -c src\electron\preload.js
if %errorlevel% neq 0 (
    echo [ERRO] Erro de sintaxe em preload.js
    pause
    exit /b 1
) else (
    echo [OK] preload.js - Sintaxe valida
)
echo.

echo [4/4] Verificando dependencias...
if not exist "node_modules\" (
    echo [AVISO] node_modules nao encontrado. Execute scripts\instalar-dependencias.bat primeiro.
    pause
    exit /b 1
) else (
    echo [OK] Dependencias instaladas
)
echo.

echo ========================================
echo   Todos os testes de sintaxe passaram!
echo ========================================
echo.

pause
