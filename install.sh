#!/bin/bash
set -e

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
