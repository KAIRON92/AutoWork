# AutoWork Robust GitHub Push & Sync Script
Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "AutoWork GitHub Push & Sync Script" -ForegroundColor Cyan
Write-Host "Target: https://github.com/KAIRON92/AutoWork.git" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Initialize Git
if (-not (Test-Path ".git")) {
    Write-Host "`n[Step 1] Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
} else {
    Write-Host "`n[Step 1] Git already initialized. Setting branch to main..." -ForegroundColor Green
    git branch -M main
}

# 2. Remote Origin
Write-Host "`n[Step 2] Configuring Remote URL..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/KAIRON92/AutoWork.git
git remote -v

# 3. Add files
Write-Host "`n[Step 3] Staging project files (.env is safely ignored)..." -ForegroundColor Yellow
git add .

# 4. Status
Write-Host "`n[Step 4] Checking Git Status..." -ForegroundColor Yellow
git status

# 5. Commit
Write-Host "`n[Step 5] Creating Commit..." -ForegroundColor Yellow
git commit -m "Add AutoWork project"

# 6. Pull remote if exists
Write-Host "`n[Step 6] Checking remote branch for existing README..." -ForegroundColor Yellow
git fetch origin main 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Remote main branch found. Merging remote README gracefully..." -ForegroundColor Green
    git pull origin main --allow-unrelated-histories --no-rebase -m "Merge remote README"
}

# 7. Push
Write-Host "`n[Step 7] Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "Remote Verification:" -ForegroundColor Cyan
git status
git ls-remote origin
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Verify your files live at: https://github.com/KAIRON92/AutoWork" -ForegroundColor Green
