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
# This prevents a root .env value from silently overriding the compose defaults.
if (-not (Test-Path $RootEnv)) { New-Item -ItemType File -Path $RootEnv -Force | Out-Null }
Set-EnvKey $RootEnv 'POSTGRES_USER' 'autowork'
Set-EnvKey $RootEnv 'POSTGRES_PASSWORD' 'autoworkpass'
Set-EnvKey $RootEnv 'POSTGRES_DB' 'autowork_db'
Set-EnvKey $RootEnv 'POSTGRES_HOST_PORT' '5432'
Set-EnvKey $RootEnv 'REDIS_HOST_PORT' '6379'

# Ensure the PostgreSQL container is running before the main launcher performs Prisma migration.
& docker compose -f $ComposeFile up -d postgres redis | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL/Redis could not be started.' }

# Wait for PostgreSQL itself to report ready.
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  & docker compose -f $ComposeFile exec -T postgres pg_isready -U autowork -d autowork_db *> $null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
}
if (-not $ready) { throw 'PostgreSQL did not become ready in time.' }

# Validate the exact credentials that Prisma uses. P1000 commonly occurs when an old
# Docker volume was initialized with a different password than the current .env.
& docker compose -f $ComposeFile exec -T postgres psql -U autowork -d autowork_db -c 'SELECT 1;' *> $null
if ($LASTEXITCODE -eq 0) { exit 0 }

Write-Host '[AutoWork] PostgreSQL credentials do not match the project defaults.' -ForegroundColor Yellow
Write-Host '[AutoWork] Recreating the local PostgreSQL volume because this launcher cannot safely recover an unknown database password.' -ForegroundColor Yellow
Write-Host '[AutoWork] This only affects the local AutoWork PostgreSQL Docker volume; Redis is preserved.' -ForegroundColor Yellow

& docker compose -f $ComposeFile stop postgres | Out-Null
& docker compose -f $ComposeFile rm -f postgres | Out-Null
$volumes = @(docker volume ls --format '{{.Name}}' | Where-Object { $_ -match '(^|[-_])postgres_data$' -or $_ -match 'autowork.*postgres' })
foreach ($volume in $volumes) {
  if ($volume) { & docker volume rm $volume | Out-Null }
}

& docker compose -f $ComposeFile up -d postgres | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL could not be recreated after credential mismatch.' }

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  & docker compose -f $ComposeFile exec -T postgres pg_isready -U autowork -d autowork_db *> $null
  if ($LASTEXITCODE -eq 0) { exit 0 }
}
throw 'Recreated PostgreSQL container did not become ready in time.'
