const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const users = await prisma.user.findMany({ include: { accounts: true } });
  for (const user of users) {
    if (user.accounts.length === 0) {
      console.log(`Fixing user ${user.email}...`);
      await prisma.account.create({
        data: {
          username: user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000),
          ownerId: user.id,
          homeDirectory: '/home/nexus',
          diskLimitMb: 10000,
          bandwidthLimitMb: 100000,
          maxDomains: 100,
          maxDatabases: 100,
          maxApps: 100,
        }
      });
      console.log('Account created!');
    }
  }
  console.log('All fixed.');
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
