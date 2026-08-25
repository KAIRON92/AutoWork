[CmdletBinding()]
param(
  [ValidateSet('menu','setup-run','run','git-push','git-update','diagnose','stop')]
  [string]$Action = 'run'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RepoRoot
$ComposeFile = Join-Path $RepoRoot 'docker/docker-compose.yml'
$BackendDir = Join-Path $RepoRoot 'backend'
$FrontendDir = Join-Path $RepoRoot 'frontend'
$EnvExample = Join-Path $RepoRoot '.env.example'
$BackendEnv = Join-Path $BackendDir '.env'
$RootEnv = Join-Path $RepoRoot '.env'

function Say($m) { Write-Host "[AutoWork] $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Fail($m) { throw "[AutoWork] $m" }
function Has($name) { return $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

function Install-WithWinget($id, $label) {
  if (-not (Has 'winget')) { Fail "WinGet is not available. Install/update Windows App Installer, then run AutoWork again." }
  Say "Installing $label with WinGet..."
  & winget install --id $id -e --source winget --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { Fail "$label installation failed. Finish the installation manually and run AutoWork again." }
  Ok "$label installation finished. Reopen PowerShell if the command is not visible yet."
}

function Ensure-Tools {
  Say "Checking system prerequisites..."
  if (-not (Has 'git')) { Install-WithWinget 'Git.Git' 'Git' }
  if (-not (Has 'node')) { Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
  if (-not (Has 'npm')) { Fail 'npm is not available. Reopen PowerShell after installing Node.js.' }
  if (-not (Has 'docker')) { Install-WithWinget 'Docker.DockerDesktop' 'Docker Desktop' }
  if (-not (Has 'docker')) { Fail 'Docker CLI is not available. Reopen PowerShell after installing Docker Desktop.' }

  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    $dockerExe = Join-Path $env:ProgramFiles 'Docker/Docker/Docker Desktop.exe'
    if (Test-Path $dockerExe) {
      Say 'Docker Desktop is installed but not running. Starting it...'
      Start-Process $dockerExe | Out-Null
    }
    Say 'Waiting for Docker Engine...'
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
      Start-Sleep -Seconds 2
      & docker info *> $null
      if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    }
    if (-not $ready) { Fail 'Docker Desktop is installed but the Engine is not ready. Open Docker Desktop, wait until it is running, then run AutoWork again.' }
  }

  Ok 'Required tools (Node.js, npm, Docker, Git) are ready.'
}

function Set-EnvKey($path, $key, $value) {
  $lines = @()
  if (Test-Path $path) { $lines = @(Get-Content $path) }
  $found = $false
  $escaped = [regex]::Escape($key)
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$escaped=") { $found = $true; "$key=$value" } else { $line }
  }
  if (-not $found) { $out += "$key=$value" }
  Set-Content -Path $path -Value $out -Encoding UTF8
}

function Ensure-Env {
  Say "Configuring environment files..."
  if (-not (Test-Path $EnvExample)) { Fail '.env.example is missing.' }
  if (-not (Test-Path $BackendEnv)) {
    Copy-Item $EnvExample $BackendEnv
    Say 'Created backend/.env from .env.example.'
  }
  if (-not (Test-Path $RootEnv)) { New-Item -ItemType File -Path $RootEnv -Force | Out-Null }

  $pgPort = 5432
  $redisPort = 6379

  Set-EnvKey $RootEnv 'POSTGRES_HOST_PORT' $pgPort
  Set-EnvKey $RootEnv 'REDIS_HOST_PORT' $redisPort
  Set-EnvKey $BackendEnv 'DATABASE_URL' "postgresql://autowork:autoworkpass@localhost:$pgPort/autowork_db?schema=public"
  Set-EnvKey $BackendEnv 'REDIS_HOST' 'localhost'
  Set-EnvKey $BackendEnv 'REDIS_PORT' $redisPort

  $existing = Get-Content $BackendEnv -Raw
  $jwt = [Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
  $enc = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
  $emailEnc = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
  if ($existing -match '<long-random-secret>|JWT_SECRET=replace') { Set-EnvKey $BackendEnv 'JWT_SECRET' $jwt }
  if ($existing -match 'REFRESH_TOKEN_SECRET=<long-random-secret>|REFRESH_TOKEN_SECRET=replace') { Set-EnvKey $BackendEnv 'REFRESH_TOKEN_SECRET' $jwt }
  if ($existing -match 'PCLOUD_CREDENTIAL_ENCRYPTION_KEY=replace-with-base64-32-byte-key') { Set-EnvKey $BackendEnv 'PCLOUD_CREDENTIAL_ENCRYPTION_KEY' $enc }
  if ($existing -match 'EMAIL_CREDENTIAL_ENCRYPTION_KEY=replace-with-base64-32-byte-key') { Set-EnvKey $BackendEnv 'EMAIL_CREDENTIAL_ENCRYPTION_KEY' $emailEnc }

  Ok "Environment configured (PostgreSQL=$pgPort, Redis=$redisPort)."
}

function Install-IfNeeded($dir, $label) {
  $modules = Join-Path $dir 'node_modules'
  if (-not (Test-Path $modules)) {
    Push-Location $dir
    try {
      Say "Installing dependencies for $label..."
      & npm install --no-audit --no-fund
      if ($LASTEXITCODE -ne 0) { Fail "npm install failed in $label." }
    } finally { Pop-Location }
  } else {
    Say "Dependencies ready for $label."
  }
}

function Prepare-Dependencies {
  Install-IfNeeded $RepoRoot 'Root'
  Install-IfNeeded $BackendDir 'Backend'
  Install-IfNeeded $FrontendDir 'Frontend'
  Ok 'All project dependencies are ready.'
}

function Start-Infra {
  Say 'Starting PostgreSQL and Redis containers...'
  & docker compose -f $ComposeFile up -d postgres redis
  if ($LASTEXITCODE -ne 0) { Fail 'PostgreSQL/Redis failed to start. Run: docker compose -f docker/docker-compose.yml logs postgres redis' }
  Ok 'Infrastructure services (Postgres & Redis) are active.'
}

function Stop-RunningProcesses {
  Say 'Releasing existing process locks...'
  Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue).CommandLine
      if ($cmd -and ($cmd -like "*$RepoRoot*" -or $cmd -like "*autowork*")) {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
      }
    } catch { }
  }
  Get-NetTCPConnection -LocalPort 3000, 4000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 600
}

function Prepare-Database {
  Say 'Synchronizing database schema and Prisma clients...'
  Push-Location $BackendDir
  try {
    & npm run prisma:generate
    if ($LASTEXITCODE -ne 0) {
      Warn 'Prisma generate hit a file lock or issue; retrying after stopping running processes...'
      Stop-RunningProcesses
      & npm run prisma:generate
      if ($LASTEXITCODE -ne 0) {
        $clientPath = Join-Path $RepoRoot 'node_modules/.prisma/client/index.js'
        if (Test-Path $clientPath) {
          Warn 'Using existing generated Prisma Client.'
        } else {
          Fail 'Prisma Client generation failed.'
        }
      }
    }

    $rootPrisma = Join-Path $RepoRoot 'node_modules/.prisma'
    $backendModules = Join-Path $BackendDir 'node_modules'
    if (Test-Path $rootPrisma) {
      Copy-Item -Path $rootPrisma -Destination $backendModules -Recurse -Force -ErrorAction SilentlyContinue
      Copy-Item -Path (Join-Path $RepoRoot 'node_modules/@prisma/client/*') -Destination (Join-Path $backendModules '@prisma/client') -Recurse -Force -ErrorAction SilentlyContinue
    }

    & npm run prisma:migrate:deploy
    if ($LASTEXITCODE -ne 0) { Fail 'Database migration failed. Check PostgreSQL and backend/.env.' }
  } finally { Pop-Location }
  Ok 'Database and Prisma clients are synchronized.'
}

function Stop-Project {
  Say 'Stopping existing AutoWork processes and containers...'
  Stop-RunningProcesses
  if (Has 'docker') {
    & docker compose -f $ComposeFile down *> $null
  }
  Ok 'AutoWork stopped.'
}

function Start-Terminals {
  Stop-RunningProcesses

  $jobs = @(
    @{Title='AutoWork Backend API'; Dir=$BackendDir; Cmd='npm run start:dev'},
    @{Title='AutoWork Frontend App'; Dir=$FrontendDir; Cmd='npm run dev'},
    @{Title='AutoWork Campaign Worker'; Dir=$RepoRoot; Cmd='npm run worker:campaign'},
    @{Title='AutoWork pCloud Worker'; Dir=$RepoRoot; Cmd='npm run worker:pcloud'},
    @{Title='AutoWork Email Worker'; Dir=$RepoRoot; Cmd='npm run worker:email'}
  )
  foreach ($job in $jobs) {
    $command = "Set-Location -LiteralPath '$($job.Dir)'; `$Host.UI.RawUI.WindowTitle='$($job.Title)'; $($job.Cmd)"
    Start-Process powershell.exe -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-Command', $command | Out-Null
  }
  Ok 'All services (Backend, Frontend, and 3 Background Workers) launched.'
}

function Wait-And-OpenBrowser {
  Say 'Waiting for services to become healthy...'
  $ready = $false
  for ($i = 0; $i -lt 35; $i++) {
    Start-Sleep -Seconds 2
    try {
      $res = Invoke-RestMethod -Uri 'http://localhost:4000/api/health' -TimeoutSec 2 -ErrorAction SilentlyContinue
      if ($res -and ($res.status -eq 'OK' -or $res.subsystems.api -eq 'HEALTHY')) {
        $ready = $true
        break
      }
    } catch { }
  }

  Say '🚀 AutoWork is LIVE!'
  Write-Host '---------------------------------------------------' -ForegroundColor Cyan
  Write-Host '  Web Application:  http://localhost:3000' -ForegroundColor Green
  Write-Host '  API Health Check: http://localhost:4000/api/health' -ForegroundColor Yellow
  Write-Host '  Swagger API Docs: http://localhost:4000/api/docs' -ForegroundColor Yellow
  Write-Host '---------------------------------------------------' -ForegroundColor Cyan

  Start-Process 'http://localhost:3000' | Out-Null
}

function Run-Project {
  Write-Host ''
  Write-Host '===================================================' -ForegroundColor Magenta
  Write-Host '       AutoWork 1-Click Universal Automation       ' -ForegroundColor Magenta
  Write-Host '===================================================' -ForegroundColor Magenta
  Stop-RunningProcesses
  Ensure-Tools
  Ensure-Env
  Prepare-Dependencies
  Start-Infra
  Prepare-Database
  Start-Terminals
  Wait-And-OpenBrowser
}

function Git-Update {
  Say 'Updating project from GitHub repository...'
  & git fetch origin
  if ($LASTEXITCODE -ne 0) { Fail 'git fetch failed.' }
  $changes = @(git status --porcelain)
  if ($changes.Count -gt 0) { Fail 'Local changes exist. Commit/stash them before updating from GitHub.' }
  & git pull --ff-only origin main
  if ($LASTEXITCODE -ne 0) { Fail 'GitHub and local main cannot be fast-forwarded safely. Resolve the branch state manually.' }
  Ok 'Local project updated from GitHub main.'
  Run-Project
}

function Git-Push {
  & git fetch origin
  if ($LASTEXITCODE -ne 0) { Fail 'git fetch failed.' }
  $changes = @(git status --porcelain)
  if ($changes.Count -eq 0) {
    & git push origin main
    if ($LASTEXITCODE -ne 0) { Fail 'git push failed.' }
    Ok 'No local changes were pending; GitHub is up to date.'
    return
  }
  & git add .
  & git diff --cached --check
  if ($LASTEXITCODE -ne 0) { Fail 'Staged diff has whitespace errors. Fix them before pushing.' }
  git status
  $msg = Read-Host 'Commit message (blank = chore: sync AutoWork changes)'
  if ([string]::IsNullOrWhiteSpace($msg)) { $msg = 'chore: sync AutoWork changes' }
  & git commit -m $msg
  if ($LASTEXITCODE -ne 0) { Fail 'git commit failed.' }
  & git push origin main
  if ($LASTEXITCODE -ne 0) { Fail 'git push failed. The remote may have new commits; update from GitHub first.' }
  Ok 'Local changes committed and pushed to GitHub main.'
}

function Diagnose {
  Write-Host ''
  Say 'AutoWork Comprehensive Diagnostics'
  Write-Host "Repository: $RepoRoot"
  if (Has 'node') { Write-Host "Node.js: $(& node -v)" }
  if (Has 'npm') { Write-Host "npm:     $(& npm -v)" }
  if (Has 'git') { Write-Host "Git:     $(& git --version)" }
  if (Has 'docker') {
    Write-Host "Docker:  $(& docker --version)"
    Write-Host "Compose: $(& docker compose version)"
    & docker compose -f $ComposeFile ps
  }
  Write-Host "backend/.env: $(Test-Path $BackendEnv)"
  Write-Host "backend/node_modules: $(Test-Path (Join-Path $BackendDir 'node_modules'))"
  Write-Host "frontend/node_modules: $(Test-Path (Join-Path $FrontendDir 'node_modules'))"
  if (Has 'git') { Write-Host 'Git Status:'; git status --short }
}

function Menu {
  Write-Host ''
  Write-Host '================ AutoWork Launcher Menu ================' -ForegroundColor Magenta
  Write-Host '1. 1-Click Launch (Auto-install, Database, Services)'
  Write-Host '2. Restart All Services'
  Write-Host '3. Update from GitHub and Run'
  Write-Host '4. Git Commit + Push'
  Write-Host '5. System Diagnostics'
  Write-Host '6. Stop All Services'
  Write-Host 'Q. Quit'
  Write-Host '========================================================'
  $choice = Read-Host 'Choose an option [1-6, Q]'
  switch ($choice.ToUpperInvariant()) {
    '1' { Run-Project }
    '2' { Run-Project }
    '3' { Git-Update }
    '4' { Git-Push }
    '5' { Diagnose }
    '6' { Stop-Project }
    'Q' { return }
    default { Warn 'Invalid choice.' }
  }
}

try {
  switch ($Action) {
    'menu' { Menu }
    'setup-run' { Run-Project }
    'run' { Run-Project }
    'git-push' { Git-Push }
    'git-update' { Git-Update }
    'diagnose' { Diagnose }
    'stop' { Stop-Project }
  }
} catch {
  Write-Host ''
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
