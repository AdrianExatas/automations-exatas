@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   Testes do Projeto ONVIO
echo ========================================
echo.

set ERROR_COUNT=0

echo [1/7] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao esta instalado ou nao esta no PATH
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js instalado: %%i
)
echo.

echo [2/7] Verificando npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] npm nao esta instalado ou nao esta no PATH
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm instalado: %%i
)
echo.

echo [3/7] Verificando arquivos principais...
for %%f in (
    "package.json"
    "src\electron\main.ts"
    "src\electron\preload.ts"
    "src\electron\automation-runner.ts"
    "src\renderer\index.html"
    "src\renderer\renderer.js"
) do (
    if not exist %%~f (
        echo [ERRO] %%~f nao encontrado
        set /a ERROR_COUNT+=1
    ) else (
        echo [OK] %%~f encontrado
    )
)
echo.

echo [4/7] Verificando utilitarios TypeScript...
for %%f in (
    "src\utils\extractUserData.ts"
    "src\utils\listUsers.ts"
) do (
    if not exist %%~f (
        echo [ERRO] %%~f nao encontrado
        set /a ERROR_COUNT+=1
    ) else (
        echo [OK] %%~f encontrado
    )
)
echo.

echo [5/7] Validando fontes...
npx tsc --noEmit >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Falha na validacao TypeScript
    set /a ERROR_COUNT+=1
) else (
    echo [OK] TypeScript valido
)

node -c src\renderer\renderer.js 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Erro ao verificar sintaxe de renderer.js
) else (
    echo [OK] renderer.js - Sintaxe valida
)
echo.

echo [6/7] Verificando dependencias...
if not exist "node_modules\" (
    echo [AVISO] node_modules nao encontrado. Execute: npm install
    set /a ERROR_COUNT+=1
) else (
    echo [OK] node_modules encontrado
)
echo.

echo [7/7] Verificando scripts e testes...
for %%f in (
    "tests\usuario-permissoes-loop.spec.js"
    "scripts\iniciar-interface.bat"
    "scripts\executar-automacao.bat"
    "scripts\executar-com-config.bat"
    "scripts\instalar-dependencias.bat"
) do (
    if exist %%~f (
        echo [OK] %%~f encontrado
    ) else (
        echo [AVISO] %%~f nao encontrado
    )
)
echo.

echo ========================================
if %ERROR_COUNT% EQU 0 (
    echo   Todos os testes passaram!
    echo   O projeto esta pronto para uso.
) else (
    echo   [ATENCAO] %ERROR_COUNT% problema(s) encontrado(s)
)
echo ========================================
echo.
pause
