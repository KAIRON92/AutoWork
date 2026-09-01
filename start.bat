@echo off
setlocal
title AutoWork 1-Click Launcher
cd /d "%~dp0"
echo [AutoWork] Starting 1-Click Universal Launcher...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\AutoWork.ps1" -Action run
if errorlevel 1 (
  echo.
  echo [AutoWork] Initial startup failed. Attempting automatic PostgreSQL credential recovery...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\repair-postgres.ps1"
  if errorlevel 1 (
    echo [AutoWork] Automatic PostgreSQL recovery failed.
    echo [AutoWork] An error occurred during startup.
    pause
    endlocal
    exit /b 1
  )
  echo [AutoWork] PostgreSQL recovery completed. Retrying AutoWork startup...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\AutoWork.ps1" -Action run
  if errorlevel 1 (
    echo.
    echo [AutoWork] Startup still failed after PostgreSQL recovery.
    pause
    endlocal
    exit /b 1
  )
)
endlocal
