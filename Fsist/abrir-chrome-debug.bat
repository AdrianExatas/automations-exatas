@echo off
echo Feche TODOS os Chromes antes de rodar este script.
echo.
REM Abre o Chrome com depuração remota na porta 9222.
REM A partir do Chrome 136, --remote-debugging-port só funciona com --user-data-dir
REM apontando para uma pasta diferente da padrão. Usamos chrome-debug-profile na
REM mesma pasta deste .bat.
REM
REM Depois instale "Gerar DANFe/DACTe" na Chrome Web Store e rode:
REM   set CHROME_DEBUG_URL=http://localhost:9222
REM   npm run automation
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
start "" %CHROME% --remote-debugging-port=9222 --user-data-dir="%~dp0chrome-debug-profile"
