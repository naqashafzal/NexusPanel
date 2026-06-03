<div align="center">
  <img src="https://raw.githubusercontent.com/naqashafzal/NexusPanel/main/apps/web/public/logo.png" alt="NexusPanel Logo" width="120" />
  <br/>
  <h1>NexusPanel</h1>
  <p><strong>The Modern, Self-Hosted PaaS for Node.js & AI Agents</strong></p>
  <p>Deploy your apps, manage your databases, and scale across multiple VPS instances from a stunning glassmorphism dashboard.</p>
</div>

---

## 🚀 Overview

**NexusPanel** is an open-source, cPanel-like hosting platform inspired by modern developer tools (Vercel, Coolify). It allows you to take any fresh Ubuntu VPS, attach it to your panel with a single `curl` command, and instantly start deploying Dockerized Node.js applications, databases, and custom domains with auto-renewing SSL certificates.

### ✨ Key Features
- 🎨 **State-of-the-art UI**: Beautiful Space-Dark Glassmorphism dashboard built with Next.js, Tailwind v4, and Space Grotesk typography.
- 🐳 **Docker-Native**: Every application and database runs in isolated Docker containers managed directly by the platform.
- 🌐 **Automated Traefik SSL**: Attach custom domains to your apps in the UI; Traefik automatically routes traffic and provisions Let's Encrypt certificates.
- 🔒 **AES-256 Encrypted Secrets**: Environment variables are encrypted at rest in the PostgreSQL database and decrypted in-memory by the worker agent.
- 📡 **Bi-Directional Command Tunnel**: Live WebSocket integration for real-time deployment logs and secure command execution across remote servers.
- 📦 **1-Click Databases**: Instantly provision isolated PostgreSQL, MySQL, and Redis instances.
- 🔄 **GitHub Integration**: Native GitHub Webhook support for automatic container rebuilds on push.

---

## 🏗️ Architecture

NexusPanel is built as a highly scalable **Turborepo Monorepo** containing three primary applications:

1. **`apps/web` (Frontend)**: A Next.js 16 (App Router) React dashboard that acts as the control plane for the entire cluster.
2. **`apps/api` (Backend)**: A NestJS REST API and Socket.io Gateway that handles authentication, database logic, and securely communicates with remote worker agents.
3. **`apps/agent` (Worker Node)**: A lightweight Node.js daemon that runs on your target VPS machines. It connects to the API via WebSockets to execute Docker commands, handle ZIP uploads, and extract GitHub repos.

**Data Layer**:
- PostgreSQL (Primary State & Configuration via Prisma ORM)
- Redis (Session handling & caching)

---

## 💻 Installation (Production)

The easiest way to install the main control panel (API + Frontend + Database) is using our official 1-click Docker installation script.

```bash
# On a fresh Ubuntu/Debian server
curl -sSL https://raw.githubusercontent.com/naqashafzal/NexusPanel/main/install.sh | sudo bash
```

Once installed, navigate to the IP address of your server to access the Setup Wizard and create your Super Admin account.

### Attaching a Worker Node
To attach a new server to your cluster to deploy apps onto:
1. Log into your NexusPanel dashboard.
2. Navigate to **Servers** -> **Add Server**.
3. Copy the generated Agent Installation command and run it on your new VPS.

---

## 🛠️ Local Development

Want to contribute or run the stack locally? Ensure you have `Node.js 20+`, `pnpm`, and `Docker` installed.

### 1. Clone & Install
```bash
git clone https://github.com/naqashafzal/NexusPanel.git
cd NexusPanel
pnpm install
```

### 2. Boot Local Databases
NexusPanel requires PostgreSQL and Redis for local development. We provide a dev-compose file to spin these up instantly.
```bash
docker-compose -f infra/docker/docker-compose.dev.yml up -d
```

### 3. Setup Environment Variables
```bash
# Initialize Prisma and apply database migrations
cd packages/shared
npx prisma generate
npx prisma db push

# Create default .env files in apps/api and apps/web if necessary
```

### 4. Run the Stack
```bash
# From the root directory, start all workspaces concurrently
pnpm dev
```
- **Frontend UI**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`
- **Worker Agent**: `http://localhost:4001`

---

## 🛡️ Security

- **WebSockets**: The Agent -> API WebSocket connection is secured via JWT authentication to prevent unauthorized commands.
- **Passwords**: Hashed securely using Argon2.
- **Agent Traffic**: All traffic between the NexusPanel and the target Server Agents should be routed over HTTPS/WSS in production environments.

---

## 📝 License

NexusPanel is completely open-source and licensed under the [MIT License](LICENSE).

<p align="center">
  <i>Built with ❤️ by the NexusPanel Team.</i>
</p>
