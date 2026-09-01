[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RepoRoot
$ComposeFile = Join-Path $RepoRoot 'docker/docker-compose.yml'
$RootEnv = Join-Path $RepoRoot '.env'
$BackendEnv = Join-Path $RepoRoot 'backend/.env'

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

Write-Host '=== AutoWork Local PostgreSQL Repair ===' -ForegroundColor Cyan
Write-Host 'Using isolated host ports: PostgreSQL 55432, Redis 56379.'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI is required. Start Docker Desktop and run this script again.'
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker Engine is not running. Start Docker Desktop and run this script again.'
}

if (-not (Test-Path $RootEnv)) { New-Item -ItemType File -Path $RootEnv -Force | Out-Null }
if (-not (Test-Path $BackendEnv)) {
  if (Test-Path (Join-Path $RepoRoot '.env.example')) {
    Copy-Item (Join-Path $RepoRoot '.env.example') $BackendEnv
  } else {
    New-Item -ItemType File -Path $BackendEnv -Force | Out-Null
  }
}

Set-EnvKey $RootEnv 'POSTGRES_HOST_PORT' '55432'
Set-EnvKey $RootEnv 'REDIS_HOST_PORT' '56379'
Set-EnvKey $BackendEnv 'DATABASE_URL' 'postgresql://autowork:autoworkpass@localhost:55432/autowork_db?schema=public'
Set-EnvKey $BackendEnv 'REDIS_HOST' 'localhost'
Set-EnvKey $BackendEnv 'REDIS_PORT' '56379'

Write-Host 'Starting/recreating AutoWork PostgreSQL and Redis...' -ForegroundColor Yellow
docker compose --env-file $RootEnv -f $ComposeFile up -d --force-recreate postgres redis
if ($LASTEXITCODE -ne 0) { throw 'Could not start AutoWork PostgreSQL/Redis. Run docker compose logs postgres redis for details.' }

Write-Host 'Waiting for PostgreSQL...' -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  docker compose --env-file $RootEnv -f $ComposeFile exec -T postgres pg_isready -U autowork -d autowork_db *> $null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
}
if (-not $ready) { throw 'AutoWork PostgreSQL did not become ready.' }

Write-Host 'Normalizing the AutoWork database password...' -ForegroundColor Yellow
docker compose --env-file $RootEnv -f $ComposeFile exec -T -u postgres postgres psql -d postgres -c "ALTER USER autowork WITH PASSWORD 'autoworkpass';" 
if ($LASTEXITCODE -ne 0) { throw 'Could not normalize the autowork PostgreSQL password.' }

Push-Location (Join-Path $RepoRoot 'backend')
try {
  Write-Host 'Generating Prisma Client...' -ForegroundColor Yellow
  npm run prisma:generate
  if ($LASTEXITCODE -ne 0) { throw 'Prisma Client generation failed.' }

  Write-Host 'Applying database migrations...' -ForegroundColor Yellow
  npm run prisma:migrate:deploy
  if ($LASTEXITCODE -ne 0) { throw 'Database migration failed. Check backend/.env and Docker PostgreSQL logs.' }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'DATABASE FIXED.' -ForegroundColor Green
Write-Host 'PostgreSQL: localhost:55432'
Write-Host 'Database:   autowork_db'
Write-Host 'User:       autowork'
Write-Host 'Password:   autoworkpass'
Write-Host 'Redis:       localhost:56379'
Write-Host 'backend/.env has been updated to use these ports.'
Write-Host ''
Write-Host 'Now start the backend with: cd backend; npm run start:dev' -ForegroundColor Cyan
