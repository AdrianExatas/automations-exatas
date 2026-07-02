$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

python -m pip install -r requirements.txt
python -m pip install pyinstaller>=6.0

python -m PyInstaller `
  --noconfirm `
  --clean `
  --onefile `
  --windowed `
  --name AgapeNFSeXML `
  --paths "$ProjectRoot\src" `
  --collect-all tkcalendar `
  --collect-all babel `
  "$ProjectRoot\apps\download_gui.py"

Write-Host ""
Write-Host "[OK] Executavel criado em: $ProjectRoot\dist\AgapeNFSeXML.exe"
