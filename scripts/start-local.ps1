[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 3000,
    [ValidateRange(1024, 65535)]
    [int]$DatabasePort = 54328,
    [switch]$PrepareOnly,
    [switch]$SkipDevUser
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot '.env.local-launcher.json'
$savedEnvironment = @{}

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE. See the output above."
    }
}

function Set-LocalEnvironment {
    param([string]$Name, [AllowEmptyString()][string]$Value)
    if (-not $savedEnvironment.ContainsKey($Name)) {
        $savedEnvironment[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process')
    }
    [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
}

function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($bytes) } finally { $random.Dispose() }
    return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

Push-Location $projectRoot
try {
    foreach ($command in @('node', 'npm.cmd', 'docker')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Install $command before running this script (Node.js 22+ and Docker Desktop with Linux containers are required)."
        }
    }
    $nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
    if ($nodeMajor -lt 22) { throw 'Node.js 22 or newer is required.' }
    $dockerOs = & docker info --format '{{.OSType}}' 2>$null
    if ($LASTEXITCODE -ne 0 -or $dockerOs -ne 'linux') {
        throw 'Start Docker Desktop in Linux-container mode, then run this script again.'
    }
    if ($Port -eq $DatabasePort) { throw 'The website and database must use different ports.' }
    if (-not $PrepareOnly -and (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)) {
        throw "Port $Port is already in use. Stop the existing server or choose -Port <free-port>."
    }

    if (Test-Path -LiteralPath $configPath) {
        $configuration = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        foreach ($property in @('DatabasePassword', 'AuthSecret', 'RateLimitKey')) {
            if ($configuration.$property -notmatch '^[0-9a-f]{64}$') {
                throw "Invalid local launcher configuration in $configPath. Restore this file from your local backup; do not change a persisted database password."
            }
        }
    } else {
        $configuration = [pscustomobject]@{
            DatabasePassword = New-LocalSecret
            AuthSecret = New-LocalSecret
            RateLimitKey = New-LocalSecret
        }
        $configuration | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
    }
    if (-not ($configuration.PSObject.Properties.Name -contains 'DevUserPassword') -or
        $configuration.DevUserPassword -notmatch '^LittleBites-[0-9a-f]{16}$') {
        # Local-only sign-in password, generated per machine and stored in the git-ignored launcher file.
        $devPassword = 'LittleBites-' + (New-LocalSecret).Substring(0, 16)
        $configuration | Add-Member -NotePropertyName DevUserPassword -NotePropertyValue $devPassword -Force
        $configuration | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
    }

    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $projectHash = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectRoot.ToLowerInvariant())) |
            Select-Object -First 6 | ForEach-Object { $_.ToString('x2') })
    } finally { $sha.Dispose() }
    $containerName = "little-bites-local-$projectHash"
    $volumeName = "$containerName-data"
    $ownerLabel = "little-bites.local-project=$projectHash"
    $databaseName = 'littlebites_local'
    $databaseUser = 'littlebites'
    $appUrl = "http://localhost:$Port"

    # Process-only settings keep this database separate from .env and automated test databases.
    $settings = @{
        NODE_ENV = 'development'
        APP_URL = $appUrl
        AUTH_SECRET = $configuration.AuthSecret
        RATE_LIMIT_HMAC_KEY = $configuration.RateLimitKey
        DATABASE_URL = "postgresql://${databaseUser}:$($configuration.DatabasePassword)@127.0.0.1:${DatabasePort}/${databaseName}?schema=public"
        PHOTO_STORAGE = 'local'
        PHOTO_LOCAL_DIRECTORY = (Join-Path $projectRoot 'var\private-uploads')
        EMAIL_DELIVERY = 'disabled'
        POSTGRES_USER = $databaseUser
        POSTGRES_PASSWORD = $configuration.DatabasePassword
        POSTGRES_DB = $databaseName
    }
    foreach ($name in $settings.Keys) { Set-LocalEnvironment $name $settings[$name] }
    foreach ($name in @('APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY', 'APPLE_REDIRECT_URI', 'TEST_DATABASE_URL')) {
        Set-LocalEnvironment $name ''
    }
    # A nonempty, unconfigured value also prevents Next.js loading an Apple client ID from .env.
    Set-LocalEnvironment 'APPLE_CLIENT_ID' ' '

    $existingNames = & docker container ls --all --filter "name=^/${containerName}$" --format '{{.Names}}'
    if ($LASTEXITCODE -ne 0) { throw 'Unable to list Docker containers.' }
    if ($existingNames -contains $containerName) {
        $inspection = & docker container inspect $containerName | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the local database container.' }
        $container = @($inspection)[0]
        $binding = @($container.HostConfig.PortBindings.'5432/tcp')[0]
        if ($container.Config.Labels.'little-bites.local-project' -ne $projectHash -or
            $binding.HostIp -ne '127.0.0.1' -or $binding.HostPort -ne "$DatabasePort" -or
            $container.Config.Env -notcontains "POSTGRES_PASSWORD=$($configuration.DatabasePassword)") {
            throw "Existing container $containerName does not match this launcher's private database configuration. No container was changed."
        }
        Invoke-Checked 'docker' @('start', $containerName)
    } else {
        Invoke-Checked 'docker' @(
            'volume', 'create', '--label', $ownerLabel, $volumeName
        )
        Invoke-Checked 'docker' @(
            'run', '--detach', '--name', $containerName, '--label', $ownerLabel,
            '--publish', "127.0.0.1:${DatabasePort}:5432",
            '--mount', "type=volume,source=$volumeName,target=/var/lib/postgresql/data",
            '--env', 'POSTGRES_USER', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB',
            'postgres:16'
        )
    }

    Write-Host 'Waiting for the isolated local PostgreSQL database...'
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        & docker exec $containerName pg_isready --username $databaseUser --dbname $databaseName *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw "Database did not become ready. Inspect it with: docker logs $containerName" }

    & npm.cmd ls --depth=0 *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Restoring dependencies from package-lock.json...'
        Invoke-Checked 'npm.cmd' @('ci')
    }
    Invoke-Checked 'npm.cmd' @('run', 'db:generate')
    Invoke-Checked 'npm.cmd' @('run', 'db:validate')
    Invoke-Checked 'npm.cmd' @('run', 'db:migrate')
    Invoke-Checked 'npm.cmd' @('run', 'db:seed')
    if (-not $SkipDevUser) {
        Set-LocalEnvironment 'ALLOW_DEV_USER_SEED' 'true'
        Set-LocalEnvironment 'DEV_USER_PASSWORD' $configuration.DevUserPassword
        Invoke-Checked 'npm.cmd' @('run', 'db:seed-dev-user')
        Set-LocalEnvironment 'DEV_USER_PASSWORD' ''
    }

    Write-Host ''
    Write-Host "Local website: $appUrl"
    if ($SkipDevUser) {
        Write-Host 'Create an account in the site; development accounts were skipped (-SkipDevUser).'
    } else {
        Write-Host 'Local development sign-in (local database only, sample data, not real people):'
        Write-Host '  Owner:  dev@littlebites.local'
        Write-Host '  Editor: partner@littlebites.local'
        Write-Host "  Password (both): $($configuration.DevUserPassword)"
        Write-Host "  The password is stored in the git-ignored file $configPath"
    }
    Write-Host 'Apple sign-in and email delivery are disabled in this local configuration.'
    Write-Host "Database stop command: docker stop $containerName"
    Write-Host 'The database volume, private photos and ignored launcher secrets persist between runs.'
    if ($PrepareOnly) {
        Write-Host 'Preparation complete. Run this script again without -PrepareOnly to start the site.'
    } else {
        Write-Host 'Starting the development server. Browse to the URL above once Next.js is ready.'
        Write-Host 'Press Ctrl+C to stop the website; the database remains available.'
        Invoke-Checked 'npm.cmd' @('run', 'dev', '--', '--hostname', '127.0.0.1', '--port', "$Port")
    }
} finally {
    foreach ($name in $savedEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
    }
    Pop-Location
}
