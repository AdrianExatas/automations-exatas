@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   Testes do Projeto ONVIO
echo ========================================
echo.

set ERROR_COUNT=0

REM Teste 1: Verificar se Node.js esta instalado
echo [1/8] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao esta instalado ou nao esta no PATH
    set /a ERROR_COUNT+=1
) else (
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERRO] Node.js nao esta funcionando corretamente
        set /a ERROR_COUNT+=1
    ) else (
        for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js instalado: %%i
    )
)
echo.

REM Teste 2: Verificar se npm esta instalado
echo [2/8] Verificando npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] npm nao esta instalado ou nao esta no PATH
    set /a ERROR_COUNT+=1
) else (
    npm --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERRO] npm nao esta funcionando corretamente
        set /a ERROR_COUNT+=1
    ) else (
        for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm instalado: %%i
    )
)
echo.

REM Teste 3: Verificar arquivos principais
echo [3/8] Verificando arquivos principais...
if not exist "package.json" (
    echo [ERRO] package.json nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] package.json encontrado
)

if not exist "src\electron\main.js" (
    echo [ERRO] src\electron\main.js nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] src\electron\main.js encontrado
)

if not exist "src\electron\preload.js" (
    echo [ERRO] src\electron\preload.js nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] src\electron\preload.js encontrado
)

if not exist "src\renderer\index.html" (
    echo [ERRO] src\renderer\index.html nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] src\renderer\index.html encontrado
)

if not exist "src\renderer\renderer.js" (
    echo [ERRO] src\renderer\renderer.js nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] src\renderer\renderer.js encontrado
)

if not exist "src\electron\automation-runner.js" (
    echo [ERRO] src\electron\automation-runner.js nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] src\electron\automation-runner.js encontrado
)
echo.

REM Teste 4: Verificar arquivos de utilitarios
echo [4/8] Verificando arquivos de utilitarios...
if not exist "src\utils\extractUserData.js" (
    echo [ERRO] src\utils\extractUserData.js nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] src\utils\extractUserData.js encontrado
)

if not exist "src\utils\listUsers.js" (
    echo [ERRO] src\utils\listUsers.js nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] src\utils\listUsers.js encontrado
)
echo.

REM Teste 5: Verificar sintaxe JavaScript
echo [5/8] Verificando sintaxe JavaScript...
node -c src\electron\automation-runner.js 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Erro ao verificar sintaxe de automation-runner.js (pode ser normal se dependencias nao estiverem instaladas)
) else (
    echo [OK] automation-runner.js - Sintaxe valida
)

node -c src\electron\main.js 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Erro ao verificar sintaxe de main.js
) else (
    echo [OK] main.js - Sintaxe valida
)

node -c src\electron\preload.js 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Erro ao verificar sintaxe de preload.js
) else (
    echo [OK] preload.js - Sintaxe valida
)
echo.

REM Teste 6: Verificar dependencias
echo [6/8] Verificando dependencias...
if not exist "node_modules\" (
    echo [AVISO] node_modules nao encontrado. Execute: npm install
    set /a ERROR_COUNT+=1
) else (
    echo [OK] node_modules encontrado
    
    if not exist "node_modules\@playwright" (
        echo [AVISO] @playwright/test nao instalado
    ) else (
        echo [OK] @playwright/test instalado
    )
    
    if not exist "node_modules\xlsx" (
        echo [AVISO] xlsx nao instalado
    ) else (
        echo [OK] xlsx instalado
    )
    
    if not exist "node_modules\electron" (
        echo [AVISO] electron nao instalado
    ) else (
        echo [OK] electron instalado
    )
)
echo.

REM Teste 7: Verificar estrutura de diretorios
echo [7/8] Verificando estrutura de diretorios...
if not exist "tests\" (
    echo [AVISO] Diretorio tests nao encontrado
) else (
    echo [OK] Diretorio tests encontrado
    if not exist "tests\usuario-permissoes-loop.spec.js" (
        echo [AVISO] tests\usuario-permissoes-loop.spec.js nao encontrado
    ) else (
        echo [OK] tests\usuario-permissoes-loop.spec.js encontrado
    )
)

if not exist "src\utils\" (
    echo [ERRO] Diretorio src\utils nao encontrado
    set /a ERROR_COUNT+=1
) else (
    echo [OK] Diretorio src\utils encontrado
)

if not exist "test-results\" (
    echo [INFO] Criando diretorio test-results...
    mkdir test-results
    echo [OK] Diretorio test-results criado
) else (
    echo [OK] Diretorio test-results existe
)
echo.

REM Teste 8: Verificar scripts .bat
echo [8/8] Verificando scripts .bat...
if exist "scripts\iniciar-interface.bat" (
    echo [OK] scripts\iniciar-interface.bat encontrado
) else (
    echo [AVISO] scripts\iniciar-interface.bat nao encontrado
)

if exist "scripts\executar-automacao.bat" (
    echo [OK] scripts\executar-automacao.bat encontrado
) else (
    echo [AVISO] scripts\executar-automacao.bat nao encontrado
)

if exist "scripts\executar-com-config.bat" (
    echo [OK] scripts\executar-com-config.bat encontrado
) else (
    echo [AVISO] scripts\executar-com-config.bat nao encontrado
)

if exist "scripts\instalar-dependencias.bat" (
    echo [OK] scripts\instalar-dependencias.bat encontrado
) else (
    echo [AVISO] scripts\instalar-dependencias.bat nao encontrado
)
echo.

REM Resumo
echo ========================================
if %ERROR_COUNT% EQU 0 (
    echo   Todos os testes passaram!
    echo   O projeto esta pronto para uso.
) else (
    echo   [ATENCAO] %ERROR_COUNT% erro(s) encontrado(s)
    echo   Revise os erros acima antes de continuar.
)
echo ========================================
echo.

if %ERROR_COUNT% GTR 0 (
    echo Proximos passos:
    echo   1. Execute: scripts\instalar-dependencias.bat
    echo   2. Execute: scripts\testar-projeto.bat novamente
    echo.
)

pause
