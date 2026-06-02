import { io } from 'socket.io-client';
import Docker from 'dockerode';
import { deployApplication, deployZipApplication } from './deploy';
import { backupDatabase } from './database';

const docker = new Docker();
const API_URL = process.env.API_URL || 'http://localhost:4000';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'fallback_agent_secret_change_me_later';
const SERVER_ID = process.env.SERVER_ID || 'mock_server_id';

const socket = io(API_URL, {
  auth: { token: AGENT_TOKEN },
  query: { serverId: SERVER_ID }
});

socket.on('connect', () => {
  console.log('[Logs] Connected to WebSocket Gateway');
});

// Bi-directional Command Tunnel
socket.on('agent_command', async (data: { command: string, payload: any }) => {
  console.log(`[Command] Received ${data.command} from Panel`);
  try {
    const { slug } = data.payload;
    if (data.command === 'deploy_app') {
      await deployApplication(data.payload);
    } else if (data.command === 'deploy_app_zip') {
      await deployZipApplication(data.payload);
    } else if (data.command === 'stop_app') {
      const container = docker.getContainer(slug);
      await container.stop().catch(() => {});
      console.log(`[Command] Stopped ${slug}`);
    } else if (data.command === 'start_app') {
      const container = docker.getContainer(slug);
      await container.start().catch(() => {});
      console.log(`[Command] Started ${slug}`);
    } else if (data.command === 'restart_app') {
      const container = docker.getContainer(slug);
      await container.restart().catch(() => {});
      console.log(`[Command] Restarted ${slug}`);
    } else if (data.command === 'delete_app') {
      const container = docker.getContainer(slug);
      await container.stop().catch(() => {});
      await container.remove().catch(() => {});
      console.log(`[Command] Deleted ${slug}`);
    } else if (data.command === 'backup_db') {
      await backupDatabase(data.payload);
    }
  } catch (error) {
    console.error(`[Command Error]`, error);
  }
});

// A simple dictionary to track streams
const activeStreams: Record<string, any> = {};

export async function streamContainerLogs(containerName: string) {
  if (activeStreams[containerName]) return;

  try {
    const container = docker.getContainer(containerName);
    const stream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail: 50,
    });

    activeStreams[containerName] = stream;

    stream.on('data', (chunk: Buffer) => {
      // Docker logs multiplexing header is 8 bytes. Remove it to get plain text.
      const logLine = chunk.toString('utf8', 8).trim();
      if (logLine) {
        socket.emit('agent_log_stream', {
          containerName,
          log: logLine
        });
      }
    });

    stream.on('end', () => {
      delete activeStreams[containerName];
    });

  } catch (error) {
    console.error(`[Logs] Failed to stream logs for ${containerName}`, error);
  }
}
