import express from 'express';
import dotenv from 'dotenv';
import Docker from 'dockerode';

dotenv.config();

const app = express();
app.use(express.json());

// On Windows, docker socket might be different, but we'll use defaults for now
const docker = new Docker();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'NexusPanel Agent' });
});

app.get('/docker/info', async (req, res) => {
  try {
    const info = await docker.info();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import multer from 'multer';
import extract from 'extract-zip';

const upload = multer({ dest: '/tmp/uploads/' });

// Port registry: persists which host port each app uses
const PORT_REGISTRY_FILE = '/tmp/nexus_port_registry.json';
const BASE_PORT = 10000;

const loadPortRegistry = (): Record<string, number> => {
  try {
    if (fs.existsSync(PORT_REGISTRY_FILE)) {
      return JSON.parse(fs.readFileSync(PORT_REGISTRY_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
};

const getOrAssignPort = (appName: string): number => {
  const registry = loadPortRegistry();
  if (registry[appName]) return registry[appName];
  // Assign next available port
  const usedPorts = Object.values(registry);
  let port = BASE_PORT;
  while (usedPorts.includes(port)) port++;
  registry[appName] = port;
  fs.writeFileSync(PORT_REGISTRY_FILE, JSON.stringify(registry, null, 2));
  return port;
};

const runCommand = (cmd: string, args: string[], logFile: string) => {
  return new Promise((resolve, reject) => {
    fs.appendFileSync(logFile, `\n> ${cmd} ${args.join(' ')}\n`);
    const p = spawn(cmd, args, { shell: true });
    p.stdout.on('data', data => fs.appendFileSync(logFile, data));
    p.stderr.on('data', data => fs.appendFileSync(logFile, data));
    p.on('close', code => {
      if (code !== 0) reject(new Error(`Command failed with code ${code}`));
      else resolve(true);
    });
  });
};

const generateDockerfile = (workDir: string, appType: string, logFile: string, options: any = {}) => {
  const dockerfilePath = path.join(workDir, 'Dockerfile');
  if (!fs.existsSync(dockerfilePath)) {
    let dockerfileContent = '';
    
    if (appType === 'python') {
      const pyVersion = options.pythonVersion || '3.11';
      const rootDir = options.appRoot ? `/app/${options.appRoot}` : '/app';
      let cmd = 'CMD ["python", "main.py"]';
      
      if (options.entryPoint) {
        const file = options.startupFile ? options.startupFile.replace('.py', '') : 'app';
        cmd = `RUN pip install gunicorn\nCMD ["gunicorn", "${file}:${options.entryPoint}", "-b", "0.0.0.0:3000"]`;
      } else if (options.startupFile) {
        cmd = `CMD ["python", "${options.startupFile}"]`;
      }

      dockerfileContent = `
FROM python:${pyVersion}-slim
WORKDIR ${rootDir}
COPY . .
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
EXPOSE 3000
${cmd}
      `.trim();
      fs.appendFileSync(logFile, `Generated Advanced Python Dockerfile (v${pyVersion}).\n`);
    } else {
      dockerfileContent = `
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
      `.trim();
      fs.appendFileSync(logFile, `Generated default Node.js Dockerfile.\n`);
    }
    fs.writeFileSync(dockerfilePath, dockerfileContent);
  } else {
    fs.appendFileSync(logFile, `Using existing Dockerfile.\n`);
  }
};

app.post('/deploy/github', async (req, res) => {
  const { repoUrl, branch, appName, appType } = req.body;
  if (!repoUrl || !branch || !appName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const workDir = path.join('/tmp', `nexus_${appName}`);
  const logFile = path.join('/tmp', `nexus_${appName}_build.log`);

  res.json({ success: true, message: 'Deployment started' });

  try {
    fs.writeFileSync(logFile, `=== Deployment Started for ${appName} ===\n`);

    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }

    fs.appendFileSync(logFile, `[1/5] Cloning repository...\n`);

    // Try specified branch first, then fall back to auto-detected default branch
    let cloneBranch = branch;
    try {
      await runCommand('git', ['clone', '-b', cloneBranch, repoUrl, workDir], logFile);
    } catch (cloneErr) {
      fs.appendFileSync(logFile, `Branch '${cloneBranch}' not found, detecting default branch...\n`);
      // Detect the actual default branch from remote
      const { execSync } = require('child_process');
      try {
        const remoteInfo = execSync(`git ls-remote --symref ${repoUrl} HEAD`, { timeout: 15000 }).toString();
        const match = remoteInfo.match(/ref: refs\/heads\/(\S+)\s+HEAD/);
        cloneBranch = match ? match[1] : 'master';
        fs.appendFileSync(logFile, `Detected default branch: ${cloneBranch}\n`);
        if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
        await runCommand('git', ['clone', '-b', cloneBranch, repoUrl, workDir], logFile);
      } catch (fallbackErr) {
        // Last resort: clone without specifying branch
        fs.appendFileSync(logFile, `Cloning without branch specifier...\n`);
        if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
        await runCommand('git', ['clone', repoUrl, workDir], logFile);
      }
    }

    fs.appendFileSync(logFile, `[2/5] Preparing Dockerfile...\n`);
    generateDockerfile(workDir, appType || 'node', logFile, req.body);

    fs.appendFileSync(logFile, `[3/5] Building Docker image...\n`);
    await runCommand('docker', ['build', '-t', appName, workDir], logFile);

    fs.appendFileSync(logFile, `[4/5] Stopping old containers...\n`);
    try {
      await runCommand('docker', ['rm', '-f', appName], logFile);
    } catch (e) {}

    const hostPort = getOrAssignPort(appName);
    fs.appendFileSync(logFile, `[5/5] Starting new container on port ${hostPort}...\n`);
    await runCommand('docker', ['run', '-d', '--name', appName, '--restart', 'unless-stopped', '-p', `${hostPort}:3000`, appName], logFile);

    fs.appendFileSync(logFile, `\n=== Deployment Successful ===\n`);
    fs.appendFileSync(logFile, `🌐 App is live at: http://${req.hostname}:${hostPort}\n`);
  } catch (error: any) {
    fs.appendFileSync(logFile, `\n=== Deployment Failed ===\n${String(error)}\n`);
  }
});

app.post('/deploy/zip', upload.single('file') as any, async (req, res) => {
  const { appName, appType } = req.body;
  if (!req.file || !appName) {
    return res.status(400).json({ error: 'Missing file or appName' });
  }

  const workDir = path.join('/tmp', `nexus_${appName}`);
  const logFile = path.join('/tmp', `nexus_${appName}_build.log`);

  res.json({ success: true, message: 'Zip Deployment started' });

  try {
    fs.writeFileSync(logFile, `=== Zip Deployment Started for ${appName} ===\n`);

    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
    fs.mkdirSync(workDir, { recursive: true });

    fs.appendFileSync(logFile, `[1/5] Extracting ZIP file...\n`);
    await extract(req.file.path, { dir: workDir });
    fs.rmSync(req.file.path);

    fs.appendFileSync(logFile, `[2/5] Preparing Dockerfile...\n`);
    generateDockerfile(workDir, appType || 'node', logFile, req.body);

    fs.appendFileSync(logFile, `[3/5] Building Docker image...\n`);
    await runCommand('docker', ['build', '-t', appName, workDir], logFile);

    fs.appendFileSync(logFile, `[4/5] Stopping old containers...\n`);
    try {
      await runCommand('docker', ['rm', '-f', appName], logFile);
    } catch (e) {}

    fs.appendFileSync(logFile, `[5/5] Starting new container...\n`);
    const hostPort = getOrAssignPort(appName);
    await runCommand('docker', ['run', '-d', '--name', appName, '--restart', 'unless-stopped', '-p', `${hostPort}:3000`, appName], logFile);

    fs.appendFileSync(logFile, `\n=== Deployment Successful ===\n`);
    fs.appendFileSync(logFile, `🌐 App is live at: http://${req.hostname}:${hostPort}\n`);
  } catch (error: any) {
    fs.appendFileSync(logFile, `\n=== Deployment Failed ===\n${String(error)}\n`);
  }
});

app.get('/deploy/logs/:appName', (req, res) => {
  const logFile = path.join('/tmp', `nexus_${req.params.appName}_build.log`);
  if (fs.existsSync(logFile)) {
    res.send(fs.readFileSync(logFile, 'utf-8'));
  } else {
    res.send('Waiting for logs...');
  }
});

app.get('/app-port/:appName', (req, res) => {
  const registry = loadPortRegistry();
  const port = registry[req.params.appName];
  if (port) {
    res.json({ port, url: `http://${req.hostname}:${port}` });
  } else {
    res.status(404).json({ error: 'App not deployed yet' });
  }
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`Agent running on port ${PORT}`);
});
