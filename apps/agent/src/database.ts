import { runContainer, createNetwork, stopAndRemoveContainer } from './docker';
import { CryptoUtil } from './utils/crypto';

export async function provisionDatabase(db: any) {
  console.log(`[Database] Provisioning ${db.type} instance: ${db.name}`);
  
  const networkName = 'nodeagent-net';
  await createNetwork(networkName);
  await stopAndRemoveContainer(db.name);

  const decryptedPassword = CryptoUtil.decrypt(db.encryptedPassword);
  
  let image = '';
  let envs: string[] = [];
  
  if (db.type === 'POSTGRES') {
    image = 'postgres:15-alpine';
    envs = [
      `POSTGRES_USER=${db.dbUser}`,
      `POSTGRES_PASSWORD=${decryptedPassword}`,
      `POSTGRES_DB=${db.name}`
    ];
  } else if (db.type === 'MYSQL') {
    image = 'mysql:8.0';
    envs = [
      `MYSQL_USER=${db.dbUser}`,
      `MYSQL_PASSWORD=${decryptedPassword}`,
      `MYSQL_DATABASE=${db.name}`,
      `MYSQL_ROOT_PASSWORD=${decryptedPassword}`
    ];
  } else if (db.type === 'REDIS') {
    image = 'redis:7-alpine';
    // Redis alpine can be secured via command args in runContainer, but we simplify for MVP
  }

  // Set internal port labels for Traefik TCP proxy if external access is needed, 
  // but for MVP databases are only accessed internally via container name.
  
  const mounts = [
    `${db.name}_data:/var/lib/${db.type === 'POSTGRES' ? 'postgresql/data' : db.type === 'MYSQL' ? 'mysql' : 'redis/data'}`
  ];

  await runContainer({
    image,
    containerName: db.name,
    networkName,
    labels: {},
    envs,
  });

  console.log(`[Database] Successfully provisioned ${db.type} instance: ${db.name}`);
}
