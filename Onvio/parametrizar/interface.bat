@echo off
chcp 65001 >nul
title Interface Gráfica - Automação Onvio
cls

echo ==========================================
echo   INTERFACE GRÁFICA - AUTOMAÇÃO ONVIO
echo ==========================================
echo.

python interface.py

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao iniciar interface!
    pause
)

