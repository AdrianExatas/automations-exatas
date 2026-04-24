@echo off
chcp 65001 >nul
cd /d "%~dp0\..\.."

echo ============================================================
echo   Download de XMLs por Chave - API SIEG
echo ============================================================
echo.

sieg-xml download

echo.
pause
