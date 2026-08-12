@echo off
echo ========================================================
echo AutoWork GitHub Deployment Tool
echo Target: https://github.com/KAIRON92/AutoWork.git
echo ========================================================
echo.

cd /d "%~dp0"

echo [Step 1] Initializing Git...
if not exist ".git" (
    git init
    git branch -M main
) else (
    echo Git repository already initialized.
    git branch -M main
)

echo.
echo [Step 2] Configuring Remote URL...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/KAIRON92/AutoWork.git
git remote -v

echo.
echo [Step 3] Staging project files (.env is protected by .gitignore)...
git add .

echo.
echo [Step 4] Checking Status...
git status

echo.
echo [Step 5] Creating Commit...
git commit -m "Add AutoWork project"

echo.
echo [Step 6] Syncing with remote repository (handling existing README)...
git fetch origin main >nul 2>&1
if %errorlevel% equ 0 (
    echo Existing remote main branch detected. Integrating remote commits...
    git pull origin main --allow-unrelated-histories --no-rebase -m "Merge remote branch"
)

echo.
echo [Step 7] Pushing to GitHub main branch...
git push -u origin main

echo.
echo ========================================================
echo Execution Summary & Remote Verification:
echo ========================================================
git status
git ls-remote origin

echo.
echo Open https://github.com/KAIRON92/AutoWork in your browser to verify!
echo ========================================================
pause
