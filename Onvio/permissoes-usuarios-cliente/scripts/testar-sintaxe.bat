@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   Testando Sintaxe dos Arquivos
echo ========================================
echo.

echo [1/3] Validando TypeScript...
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo [ERRO] Falha na validacao TypeScript
    pause
    exit /b 1
) else (
    echo [OK] TypeScript valido
)
echo.

echo [2/3] Testando renderer.js...
node -c src\renderer\renderer.js
if %errorlevel% neq 0 (
    echo [ERRO] Erro de sintaxe em renderer.js
    pause
    exit /b 1
) else (
    echo [OK] renderer.js - Sintaxe valida
)
echo.

echo [3/3] Verificando dependencias...
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
