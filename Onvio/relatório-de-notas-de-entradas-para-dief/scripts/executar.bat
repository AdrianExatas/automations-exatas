@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

call npm run build
if errorlevel 1 (
  echo Falha ao compilar.
  pause
  exit /b 1
)

node dist/index.js
echo.
pause
