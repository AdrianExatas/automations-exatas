@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   ONVIO - Executar Automacao
echo   (Com arquivo de configuracao)
echo ========================================
echo.

REM Verificar se arquivo .env existe
if not exist ".env" (
    if exist ".env.example" (
        echo [AVISO] Arquivo .env nao encontrado.
        echo Copiando .env.example para .env...
        copy ".env.example" ".env" >nul
        echo.
        echo Arquivo .env criado. Por favor, edite-o com suas credenciais.
        echo.
        pause
        exit /b 1
    ) else (
        echo [ERRO] Arquivo .env nao encontrado e .env.example tambem nao existe.
        pause
        exit /b 1
    )
)

REM Carregar configuracoes do arquivo .env
echo Carregando configuracoes de .env...
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="ONVIO_EMAIL" set ONVIO_EMAIL=%%b
    if "%%a"=="ONVIO_PASSWORD" set ONVIO_PASSWORD=%%b
    if "%%a"=="ONVIO_CLIENT_ID" set ONVIO_CLIENT_ID=%%b
    if "%%a"=="ONVIO_MFA_METHOD" set ONVIO_MFA_METHOD=%%b
    if "%%a"=="ONVIO_MFA_CODE" set ONVIO_MFA_CODE=%%b
)

REM Validacoes
if "%ONVIO_EMAIL%"=="" (
    echo [ERRO] ONVIO_EMAIL nao configurado em .env
    pause
    exit /b 1
)

if "%ONVIO_PASSWORD%"=="" (
    echo [ERRO] ONVIO_PASSWORD nao configurado em .env
    pause
    exit /b 1
)

if "%ONVIO_CLIENT_ID%"=="" set ONVIO_CLIENT_ID=467
if "%ONVIO_MFA_METHOD%"=="" set ONVIO_MFA_METHOD=E-mail

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

REM Executar o teste com as variaveis de ambiente
set ONVIO_EMAIL=%ONVIO_EMAIL%
set ONVIO_PASSWORD=%ONVIO_PASSWORD%
set ONVIO_CLIENT_ID=%ONVIO_CLIENT_ID%
set ONVIO_MFA_METHOD=%ONVIO_MFA_METHOD%
set ONVIO_MFA_CODE=%ONVIO_MFA_CODE%

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
