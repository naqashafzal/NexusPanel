<<<<<<< HEAD
<#
.SYNOPSIS
Installs system dependencies and sets up the NexusPanel application automatically on Windows.
#>

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Starting NexusPanel Full Auto-Installation..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Check for Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "This script requires Administrator privileges to install system packages (Docker, Node.js)."
    Write-Warning "Please restart PowerShell as Administrator and run this script again."
    exit 1
}

# 2. Ensure Chocolatey is installed for package management
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "[+] Chocolatey not found. Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Host "[+] Chocolatey installed successfully!" -ForegroundColor Green
    
    # Reload environment variables for current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "[✓] Chocolatey is already installed." -ForegroundColor Green
}

# 3. Install Docker Desktop
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[+] Docker not found. Installing Docker Desktop..." -ForegroundColor Yellow
    choco install docker-desktop -y
    Write-Host "[+] Docker installed successfully! Note: Docker might require a system restart to function properly." -ForegroundColor Green
    
    # Reload env vars
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "[✓] Docker is already installed." -ForegroundColor Green
}

# 4. Install Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[+] Node.js not found. Installing Node.js..." -ForegroundColor Yellow
    choco install nodejs-lts -y
    Write-Host "[+] Node.js installed successfully!" -ForegroundColor Green
    
    # Reload env vars
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "[✓] Node.js is already installed." -ForegroundColor Green
}

# 5. Install pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "[+] pnpm not found. Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "[+] pnpm installed successfully!" -ForegroundColor Green
} else {
    Write-Host "[✓] pnpm is already installed." -ForegroundColor Green
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "All system dependencies are installed! Setting up NexusPanel..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Use Node.js to generate random crypto secrets (since openssl might not be available natively on Windows)
Write-Host "Generating secure cryptographic secrets..." -ForegroundColor Yellow
$scriptPath = Join-Path -Path $env:TEMP -ChildPath "generate-secrets.js"
$jsCode = @"
const crypto = require('crypto');
console.log(crypto.randomBytes(16).toString('hex'));
console.log(crypto.randomBytes(16).toString('hex'));
console.log(crypto.randomBytes(16).toString('hex'));
console.log(crypto.randomBytes(16).toString('hex'));
"@
Set-Content -Path $scriptPath -Value $jsCode
$secrets = node $scriptPath
$JWT_SECRET = $secrets[0]
$ENCRYPTION_KEY = $secrets[1]
$AGENT_TOKEN = $secrets[2]
$GITHUB_WEBHOOK_SECRET = $secrets[3]

Remove-Item -Path $scriptPath -Force

Write-Host "Setting up the .env file..." -ForegroundColor Yellow
$envContent = @"
# Database Configuration
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/hostsphere?schema=public"

# Cryptographic Secrets
JWT_SECRET="${JWT_SECRET}"
ENCRYPTION_KEY="${ENCRYPTION_KEY}"
AGENT_TOKEN="${AGENT_TOKEN}"
GITHUB_WEBHOOK_SECRET="${GITHUB_WEBHOOK_SECRET}"

# Application Configuration
PORT=4000
API_URL="http://localhost:4000"
"@
Set-Content -Path ".env" -Value $envContent
Write-Host "[✓] .env file generated successfully!" -ForegroundColor Green

Write-Host "Booting core services (PostgreSQL & Redis) via docker-compose..." -ForegroundColor Yellow
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose -f infra/docker/docker-compose.dev.yml up -d
} else {
    docker compose -f infra/docker/docker-compose.dev.yml up -d
}

Write-Host "Waiting for PostgreSQL to become ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Installing project dependencies..." -ForegroundColor Yellow
pnpm install

Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
pnpm dlx prisma@5.22.0 generate --schema=packages/shared/prisma/schema.prisma

Write-Host "Pushing database schema..." -ForegroundColor Yellow
pnpm dlx prisma@5.22.0 db push --schema=packages/shared/prisma/schema.prisma

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Installation completed successfully!" -ForegroundColor Green
Write-Host "Your secure .env file has been generated." -ForegroundColor Green
Write-Host "Core infrastructure is running in Docker." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting NexusPanel..." -ForegroundColor Yellow
Write-Host "➡️  You can access your panel at: http://localhost:3000" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

# Auto-start the application
pnpm dev
=======
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
>>>>>>> 73cafaa9b81cc102d672b82d9a7556b750667968
