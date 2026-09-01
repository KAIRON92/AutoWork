[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ComposeFile = Join-Path $RepoRoot 'docker/docker-compose.yml'
$RootEnv = Join-Path $RepoRoot '.env'

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

Set-Location $RepoRoot

# Keep Docker Compose's PostgreSQL credentials identical to the credentials used by Prisma.
if (-not (Test-Path $RootEnv)) { New-Item -ItemType File -Path $RootEnv -Force | Out-Null }
Set-EnvKey $RootEnv 'POSTGRES_USER' 'autowork'
Set-EnvKey $RootEnv 'POSTGRES_PASSWORD' 'autoworkpass'
Set-EnvKey $RootEnv 'POSTGRES_DB' 'autowork_db'
Set-EnvKey $RootEnv 'POSTGRES_HOST_PORT' '5432'
Set-EnvKey $RootEnv 'REDIS_HOST_PORT' '6379'

# The main launcher has already started postgres/redis before invoking this recovery script.
# Do not run `up` again while postgres is running: Docker will try to bind 5432 a second time.
# Stop/remove only the AutoWork postgres container, leaving Redis alone.
& docker compose -f $ComposeFile stop postgres *> $null
& docker compose -f $ComposeFile rm -f postgres *> $null

# Start PostgreSQL with the credentials declared above.
& docker compose -f $ComposeFile up -d postgres
if ($LASTEXITCODE -ne 0) {
  throw 'PostgreSQL could not be started. Port 5432 may be occupied by another application or PostgreSQL installation.'
}

# Wait for PostgreSQL to become ready.
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  & docker compose -f $ComposeFile exec -T postgres pg_isready -U autowork -d autowork_db *> $null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
}
if (-not $ready) { throw 'PostgreSQL did not become ready in time.' }

# Validate the actual password over TCP. A local socket check alone can succeed through
# PostgreSQL's local authentication rules even when Prisma's password is wrong.
& docker compose -f $ComposeFile exec -T postgres sh -lc 'PGPASSWORD=autoworkpass psql -h 127.0.0.1 -U autowork -d autowork_db -c "SELECT 1;"' *> $null
if ($LASTEXITCODE -eq 0) { exit 0 }

Write-Host '[AutoWork] PostgreSQL credentials do not match the project defaults.' -ForegroundColor Yellow
Write-Host '[AutoWork] Recreating the local PostgreSQL volume because the existing volume was initialized with different credentials.' -ForegroundColor Yellow
Write-Host '[AutoWork] This removes only the local AutoWork PostgreSQL Docker volume. Redis is preserved.' -ForegroundColor Yellow

& docker compose -f $ComposeFile stop postgres *> $null
& docker compose -f $ComposeFile rm -f postgres *> $null
$volumes = @(docker volume ls --format '{{.Name}}' | Where-Object { $_ -match '(^|[-_])postgres_data$' -or $_ -match 'autowork.*postgres' })
foreach ($volume in $volumes) {
  if ($volume) { & docker volume rm $volume | Out-Null }
}

& docker compose -f $ComposeFile up -d postgres
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL could not be recreated after credential mismatch.' }

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  & docker compose -f $ComposeFile exec -T postgres pg_isready -U autowork -d autowork_db *> $null
  if ($LASTEXITCODE -eq 0) { exit 0 }
}
throw 'Recreated PostgreSQL container did not become ready in time.'
