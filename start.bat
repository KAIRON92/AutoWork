@echo off
setlocal
title AutoWork 1-Click Launcher
cd /d "%~dp0"
echo [AutoWork] Starting 1-Click Universal Launcher...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\AutoWork.ps1" -Action run
if errorlevel 1 (
  echo.
  echo [AutoWork] An error occurred during startup.
  pause
)
endlocal
