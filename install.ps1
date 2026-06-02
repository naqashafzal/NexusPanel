Write-Host "================================================="
Write-Host "     NexusPanel 1-Click Installation (Windows)   "
Write-Host "================================================="

# Check for Docker
if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Error "Docker could not be found. Please install Docker Desktop first."
    exit 1
}

Write-Host "Generating secure secrets..."

function New-RandomHexSecret {
    param([int]$Bytes)
    $rnd = [byte[]]::new($Bytes)
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($rnd)
    return [System.BitConverter]::ToString($rnd).Replace("-", "").ToLower()
}

try {
    $JWT_SECRET = New-RandomHexSecret -Bytes 32
    $JWT_REFRESH_SECRET = New-RandomHexSecret -Bytes 32
    $AGENT_SIGNING_SECRET = New-RandomHexSecret -Bytes 32
    $ENCRYPTION_KEY = New-RandomHexSecret -Bytes 16
} catch {
    Write-Warning "Falling back to default secrets..."
    $JWT_SECRET = "fallback_jwt_secret_change_me_later"
    $JWT_REFRESH_SECRET = "fallback_refresh_secret_change_me_later"
    $AGENT_SIGNING_SECRET = "fallback_agent_secret_change_me_later"
    $ENCRYPTION_KEY = "12345678901234567890123456789012"
}

Write-Host "Creating environment file..."
$envContent = @"
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/nodeagent?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="$JWT_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
ENCRYPTION_KEY="$ENCRYPTION_KEY"
PANEL_URL="http://localhost:3000"
API_URL="http://localhost:4000"
AGENT_SIGNING_SECRET="$AGENT_SIGNING_SECRET"
LETSENCRYPT_EMAIL="admin@example.com"
STORAGE_DRIVER="local"
"@

Set-Content -Path ".env" -Value $envContent

Write-Host "Environment initialized. Starting NexusPanel..."

try {
    docker compose -f infra/docker-compose.dev.yml up -d
} catch {
    docker-compose -f infra/docker-compose.dev.yml up -d
}

Write-Host "================================================="
Write-Host " Installation Complete! "
Write-Host " Please wait a few seconds for services to boot."
Write-Host " PostgreSQL is running on port 5432."
Write-Host " Redis is running on port 6379."
Write-Host " Traefik proxy is running on ports 80/443/8080."
Write-Host " Start the node apps with 'pnpm dev' (for development) or build them with 'pnpm build'."
Write-Host "================================================="
