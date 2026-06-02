import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import extract from 'extract-zip';
import { runContainer, createNetwork, stopAndRemoveContainer } from './docker';
import { CryptoUtil } from './utils/crypto';
import { streamContainerLogs } from './logs';

const execAsync = util.promisify(exec);
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspace');

export async function deployApplication(app: any) {
  const appDir = path.join(WORKSPACE_DIR, app.slug);
  console.log(`[Deploy] Starting deployment for ${app.slug}`);
  await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  
  if (app.deployMethod === 'GITHUB' && app.repoUrl) {
    console.log(`[Deploy] Cloning repository: ${app.repoUrl}`);
    await fs.rm(appDir, { recursive: true, force: true }).catch(() => {});
    await execAsync(`git clone ${app.repoUrl} ${appDir}`);
  }

  const dockerfilePath = path.join(appDir, 'Dockerfile');
  const hasDockerfile = await fs.access(dockerfilePath).then(() => true).catch(() => false);
  if (!hasDockerfile) {
    const dockerfileContent = `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN npm run build\nEXPOSE ${app.internalPort || 3000}\nCMD ["npm", "start"]`;
    await fs.writeFile(dockerfilePath, dockerfileContent);
  }

  const imageTag = `nodeagent-${app.slug}:latest`;
  await execAsync(`docker build -t ${imageTag} .`, { cwd: appDir });

  const networkName = `nodeagent-net`;
  await createNetwork(networkName);
  await stopAndRemoveContainer(app.slug);

  const labels: Record<string, string> = { 'traefik.enable': 'true' };
  if (app.domains && app.domains.length > 0) {
    const domain = app.domains[0].domain;
    labels[`traefik.http.routers.${app.slug}.rule`] = `Host(\`${domain}\`)`;
    labels[`traefik.http.routers.${app.slug}.entrypoints`] = 'web';
    labels[`traefik.http.services.${app.slug}.loadbalancer.server.port`] = `${app.internalPort || 3000}`;
  }

  const envs = (app.envVars || []).map((e: any) => `${e.key}=${CryptoUtil.decrypt(e.encryptedValue)}`);

  await runContainer({
    image: imageTag,
    containerName: app.slug,
    networkName,
    labels,
    envs
  });

  streamContainerLogs(app.slug);
  console.log(`[Deploy] Successfully deployed ${app.slug}`);
}

export async function deployZipApplication(payload: any) {
  const { slug, zipUrl, internalPort, domains, envVars } = payload;
  const appDir = path.join(WORKSPACE_DIR, slug);
  const zipPath = path.join(WORKSPACE_DIR, `${slug}.zip`);

  console.log(`[Deploy] Starting ZIP deployment for ${slug}`);
  await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  await fs.rm(appDir, { recursive: true, force: true }).catch(() => {});

  // Download ZIP
  console.log(`[Deploy] Downloading ZIP from ${zipUrl}`);
  const response = await axios({ url: zipUrl, method: 'GET', responseType: 'arraybuffer' });
  await fs.writeFile(zipPath, response.data);

  // Extract ZIP
  console.log(`[Deploy] Extracting ZIP`);
  await extract(zipPath, { dir: appDir });
  await fs.unlink(zipPath).catch(() => {});

  // Fallback Dockerfile
  const dockerfilePath = path.join(appDir, 'Dockerfile');
  const hasDockerfile = await fs.access(dockerfilePath).then(() => true).catch(() => false);
  if (!hasDockerfile) {
    const dockerfileContent = `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN npm run build\nEXPOSE ${internalPort || 3000}\nCMD ["npm", "start"]`;
    await fs.writeFile(dockerfilePath, dockerfileContent);
  }

  const imageTag = `nodeagent-${slug}:latest`;
  console.log(`[Deploy] Building Docker Image`);
  await execAsync(`docker build -t ${imageTag} .`, { cwd: appDir });

  const networkName = `nodeagent-net`;
  await createNetwork(networkName);
  await stopAndRemoveContainer(slug);

  const labels: Record<string, string> = { 'traefik.enable': 'true' };
  if (domains && domains.length > 0) {
    const domain = domains[0].domain;
    labels[`traefik.http.routers.${slug}.rule`] = `Host(\`${domain}\`)`;
    labels[`traefik.http.routers.${slug}.entrypoints`] = 'web';
    labels[`traefik.http.services.${slug}.loadbalancer.server.port`] = `${internalPort || 3000}`;
  }

  const envs = (envVars || []).map((e: any) => `${e.key}=${CryptoUtil.decrypt(e.encryptedValue)}`);

  await runContainer({
    image: imageTag,
    containerName: slug,
    networkName,
    labels,
    envs
  });

  streamContainerLogs(slug);
  console.log(`[Deploy] Successfully deployed ZIP app ${slug}`);
}
