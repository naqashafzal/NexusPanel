#!/bin/bash
set -e

<<<<<<< HEAD
echo "================================================================"
echo "Starting NexusPanel Full Auto-Installation..."
echo "================================================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Fix cdrom issues in apt sources before any apt commands are run
if command_exists apt-get; then
    sudo sed -i 's/^deb cdrom/#deb cdrom/g' /etc/apt/sources.list 2>/dev/null || true
    
    # If no network repositories are configured (common on fresh CD-ROM installs), add them
    if ! grep -q "^deb http" /etc/apt/sources.list; then
        echo "[+] No network repositories found. Adding default Debian mirrors..."
        sudo bash -c 'cat <<EOF >> /etc/apt/sources.list
deb http://deb.debian.org/debian trixie main contrib non-free non-free-firmware
deb http://deb.debian.org/debian-security trixie-security main contrib non-free non-free-firmware
deb http://deb.debian.org/debian trixie-updates main contrib non-free non-free-firmware
EOF'
        sudo apt-get update || true
    fi
fi

# 0. Install curl if missing
if ! command_exists curl; then
    echo "[+] curl not found. Attempting to install..."
    if command_exists apt-get; then
        # Ignore cdrom update failures
        sudo apt-get update || true
        sudo apt-get install -y curl || true
    elif command_exists yum; then
        sudo yum install -y curl || true
    elif command_exists dnf; then
        sudo dnf install -y curl || true
    fi
fi

# Fallback download function
download_to_file() {
    if command_exists curl; then
        curl -fsSL "$1" -o "$2"
    elif command_exists wget; then
        wget -qO "$2" "$1"
    else
        echo "[-] Neither curl nor wget is installed. Cannot download $1."
        exit 1
    fi
}

download_to_stdout() {
    if command_exists curl; then
        curl -fsSL "$1"
    elif command_exists wget; then
        wget -qO- "$1"
    else
        echo "[-] Neither curl nor wget is installed. Cannot download $1."
        exit 1
    fi
}

# 1. Install Docker & Docker Compose if missing
if ! command_exists docker; then
    echo "[+] Docker not found. Installing Docker..."
    download_to_file "https://get.docker.com" "get-docker.sh"
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker $USER
    echo "[+] Docker installed successfully!"
else
    echo "[✓] Docker is already installed."
fi

# 2. Install Node.js if missing (Using NVM)
if ! command_exists node; then
    echo "[+] Node.js not found. Installing NVM and Node.js..."
    download_to_stdout "https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh" | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
    nvm alias default 20
    echo "[+] Node.js installed successfully!"
else
    echo "[✓] Node.js is already installed."
fi

# Make sure nvm is loaded for the rest of the script
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. Install pnpm if missing
if ! command_exists pnpm; then
    echo "[+] pnpm not found. Installing pnpm..."
    npm install -g pnpm
    echo "[+] pnpm installed successfully!"
else
    echo "[✓] pnpm is already installed."
fi

# 4. Install OpenSSL if missing
if ! command_exists openssl; then
    echo "[+] OpenSSL not found. Installing OpenSSL..."
    if command_exists apt-get; then
        sudo apt-get update || true
        sudo apt-get install -y openssl
    elif command_exists yum; then
        sudo yum install -y openssl
    elif command_exists dnf; then
        sudo dnf install -y openssl
    else
        echo "[-] Could not install OpenSSL automatically. Please install it manually."
        exit 1
    fi
else
    echo "[✓] OpenSSL is already installed."
fi

echo "================================================================"
echo "All system dependencies are installed! Setting up NexusPanel..."
echo "================================================================"

echo "Generating secure cryptographic secrets..."
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
AGENT_TOKEN=$(openssl rand -hex 32)
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)

echo "Setting up the .env file..."
cat <<EOF > .env
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
EOF
echo "[✓] .env file generated successfully!"

echo "Booting core services (PostgreSQL & Redis) via docker-compose..."
if command_exists docker-compose; then
    sudo docker-compose -f infra/docker/docker-compose.dev.yml up -d
else
    sudo docker compose -f infra/docker/docker-compose.dev.yml up -d
fi

echo "Waiting for PostgreSQL to become ready..."
sleep 5

echo "Installing project dependencies..."
pnpm install

echo "Generating Prisma Client..."
pnpm dlx prisma@5.22.0 generate --schema=packages/shared/prisma/schema.prisma

echo "Pushing database schema..."
pnpm dlx prisma@5.22.0 db push --schema=packages/shared/prisma/schema.prisma

echo "================================================================"
echo "Installation completed successfully!"
echo "Your secure .env file has been generated."
echo "Core infrastructure is running in Docker."
echo ""
echo "Note: If this is a fresh Docker install, you might need to log out and log back in or run 'newgrp docker' to use docker without sudo."
echo "================================================================"
echo ""
echo "Starting NexusPanel..."
echo "➡️  You can access your panel at: http://localhost:3000"
echo "================================================================"

# Auto-start the application
pnpm dev
=======
echo "================================================="
echo "   NexusPanel 1-Click Installation (Linux/Mac)   "
echo "================================================="

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Docker could not be found. Please install Docker first."
    exit 1
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose could not be found. Please install Docker Compose first."
    exit 1
fi

echo "Generating secure secrets..."
JWT_SECRET=$(openssl rand -hex 32 || echo "fallback_jwt_secret_change_me_later")
JWT_REFRESH_SECRET=$(openssl rand -hex 32 || echo "fallback_refresh_secret_change_me_later")
AGENT_SIGNING_SECRET=$(openssl rand -hex 32 || echo "fallback_agent_secret_change_me_later")
ENCRYPTION_KEY=$(openssl rand -hex 16 || echo "12345678901234567890123456789012")

echo "Creating environment file..."
cat > .env <<EOF
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/nodeagent?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
ENCRYPTION_KEY="${ENCRYPTION_KEY}"
PANEL_URL="http://localhost:3000"
API_URL="http://localhost:4000"
AGENT_SIGNING_SECRET="${AGENT_SIGNING_SECRET}"
LETSENCRYPT_EMAIL="admin@example.com"
STORAGE_DRIVER="local"
EOF

echo "Environment initialized. Starting NexusPanel..."

if docker compose version &> /dev/null; then
  docker compose -f infra/docker-compose.dev.yml up -d
else
  docker-compose -f infra/docker-compose.dev.yml up -d
fi

echo "================================================="
echo " Installation Complete! "
echo " Please wait a few seconds for services to boot."
echo " PostgreSQL is running on port 5432."
echo " Redis is running on port 6379."
echo " Traefik proxy is running on ports 80/443/8080."
echo " Start the node apps with 'pnpm dev' (for development) or build them with 'pnpm build'."
echo "================================================="
>>>>>>> 73cafaa9b81cc102d672b82d9a7556b750667968
