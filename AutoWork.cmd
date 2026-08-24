@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\AutoWork.ps1"
if errorlevel 1 (
  echo.
  echo AutoWork stopped because an error occurred.
  pause
)
endlocal
