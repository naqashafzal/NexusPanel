import express from 'express';
import dotenv from 'dotenv';
import Docker from 'dockerode';

dotenv.config();

const app = express();
app.use(express.json());

// On Windows, docker socket might be different, but we'll use defaults for now
const docker = new Docker();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'HostSphere Agent' });
});

app.get('/docker/info', async (req, res) => {
  try {
    const info = await docker.info();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`Agent running on port ${PORT}`);
});
