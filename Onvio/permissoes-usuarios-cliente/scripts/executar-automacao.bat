@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   ONVIO - Executar Automacao
echo   (Linha de Comando)
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

REM Solicitar credenciais
set /p ONVIO_EMAIL="Digite o E-mail: "
set /p ONVIO_PASSWORD="Digite a Senha: "
set /p ONVIO_CLIENT_ID="Digite o ID do Cliente (pressione Enter para usar 467): "

if "%ONVIO_CLIENT_ID%"=="" set ONVIO_CLIENT_ID=467

set /p ONVIO_MFA_METHOD="Metodo MFA (E-mail ou SMS/Telefonema) [E-mail]: "
if "%ONVIO_MFA_METHOD%"=="" set ONVIO_MFA_METHOD=E-mail

set /p ONVIO_MFA_CODE="Codigo MFA (opcional, deixe vazio para insercao manual): "

echo.
echo ========================================
echo   Configuracao:
echo   E-mail: %ONVIO_EMAIL%
echo   Cliente ID: %ONVIO_CLIENT_ID%
echo   Metodo MFA: %ONVIO_MFA_METHOD%
echo ========================================
echo.
echo Iniciando automacao...
echo.

REM Executar o teste
call npm test -- tests\usuario-permissoes-loop.spec.js

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] A automacao falhou
    pause
    exit /b 1
)

echo.
echo [OK] Automacao concluida com sucesso!
echo.
echo Os arquivos foram salvos em: test-results\
echo.

pause
