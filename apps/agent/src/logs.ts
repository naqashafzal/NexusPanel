import { io } from 'socket.io-client';
import Docker from 'dockerode';

const docker = new Docker();
const API_URL = process.env.API_URL || 'http://localhost:4000';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'fallback_agent_secret_change_me_later';

const socket = io(API_URL, {
  auth: { token: AGENT_TOKEN },
});

socket.on('connect', () => {
  console.log('[Logs] Connected to WebSocket Gateway');
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
