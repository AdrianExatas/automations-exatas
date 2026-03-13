@echo off
chcp 65001 >nul
cls
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          AUTOMACAO ONVIO - EXECUTAR                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verificar se Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado!
    echo.
    echo Por favor, instale o Python:
    echo https://www.python.org/downloads/
    echo.
    echo Lembre-se de marcar "Add Python to PATH" durante a instalacao!
    echo.
    pause
    exit /b 1
)

echo [INFO] Python encontrado!
echo.

REM Verificar se Selenium esta instalado
python -c "import selenium" 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Selenium nao instalado!
    echo [INFO] Instalando dependencias...
    echo.
    pip install -r requirements.txt
    echo.
)

echo [INFO] Iniciando automacao...
echo ════════════════════════════════════════════════════════════════
echo.

python automacao.py

echo.
echo ════════════════════════════════════════════════════════════════
echo [INFO] Automacao finalizada!
echo.
pause
