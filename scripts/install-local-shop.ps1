[CmdletBinding()]
param(
  [string]$DatabaseName = "pajoy_production",
  [string]$DatabaseUser = "postgres",
  [string]$DatabaseHost = "127.0.0.1",
  [int]$DatabasePort = 5432,
  [int]$ApiPort = 3001,
  [string]$AdminUsername = "admin",
  [Parameter(Mandatory = $true)]
  [string]$AdminPassword
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$pnpm = (Get-Command pnpm.cmd -ErrorAction Stop).Source
$psql = (Get-Command psql.exe -ErrorAction Stop).Source

if ($AdminPassword.Length -lt 12 -or $AdminPassword -cnotmatch '[A-Z]' -or $AdminPassword -cnotmatch '[a-z]' -or $AdminPassword -cnotmatch '[0-9]' -or $AdminPassword -cnotmatch '[^A-Za-z0-9]') {
  throw "AdminPassword must be at least 12 characters and include upper case, lower case, number, and symbol."
}

$connection = "postgres://$DatabaseUser@$DatabaseHost`:$DatabasePort/$DatabaseName"
$databaseExists = & $psql -w -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
if (-not $databaseExists) {
  & $psql -w -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d postgres -c "CREATE DATABASE $DatabaseName"
}

$env:DATABASE_URL = $connection
$env:BOOTSTRAP_ADMIN_USERNAME = $AdminUsername
$env:BOOTSTRAP_ADMIN_PASSWORD = $AdminPassword
$env:PORT = [string]$ApiPort
$env:ALLOWED_ORIGINS = ""

Push-Location $repo
try {
  & $pnpm install --frozen-lockfile
  & $pnpm --filter @workspace/scripts production:init
  & $pnpm --filter @workspace/api-server build
} finally {
  Pop-Location
}

[Environment]::SetEnvironmentVariable("PAJOY_DATABASE_URL", $connection, "Machine")
[Environment]::SetEnvironmentVariable("PAJOY_API_PORT", [string]$ApiPort, "Machine")
[Environment]::SetEnvironmentVariable("API_BASE_URL", "http://127.0.0.1:$ApiPort", "Machine")

$taskName = "Pajoy Smart Business API"
$startCommand = "`"$pnpm`" --filter @workspace/api-server start"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -Command `"`$env:NODE_ENV='production'; `$env:DATABASE_URL=[Environment]::GetEnvironmentVariable('PAJOY_DATABASE_URL','Machine'); `$env:PORT=[Environment]::GetEnvironmentVariable('PAJOY_API_PORT','Machine'); Set-Location '$repo'; & '$pnpm' --filter @workspace/api-server start`"" -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

Write-Host "Pajoy local shop setup complete."
Write-Host "API: http://127.0.0.1:$ApiPort"
Write-Host "PostgreSQL is configured through localhost only."
Write-Host "The API runs automatically at Windows startup."
