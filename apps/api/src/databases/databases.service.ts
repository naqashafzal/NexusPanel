import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoUtil } from '../utils/crypto.util';

@Injectable()
export class DatabasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.database.findMany({
      where: { account: { ownerId: userId } },
      include: { server: true }
    });
  }

  async create(userId: string, data: any) {
    const account = await this.prisma.account.findFirst({
      where: { ownerId: userId }
    });
    if (!account) throw new BadRequestException('No account found for user');

    const server = await this.prisma.server.findUnique({
      where: { id: data.serverId }
    });
    if (!server) throw new BadRequestException('Invalid server selected');

    const randomPassword = require('crypto').randomBytes(16).toString('hex');
    const encryptedPassword = CryptoUtil.encrypt(randomPassword);

    let port = 5432;
    if (data.type === 'MYSQL') port = 3306;
    if (data.type === 'REDIS') port = 6379;
    if (data.type === 'MONGODB') port = 27017;

    return this.prisma.database.create({
      data: {
        name: data.name,
        type: data.type,
        port: port,
        username: data.type === 'REDIS' ? null : 'nexusadmin',
        password: encryptedPassword,
        serverId: data.serverId,
        accountId: account.id,
      },
    });
  }

  async remove(id: string, userId: string) {
    const db = await this.prisma.database.findFirst({
      where: { id, account: { ownerId: userId } }
    });
    if (!db) throw new NotFoundException('Database not found');

    return this.prisma.database.delete({
      where: { id },
    });
  }

  async backup(id: string, userId: string) {
    const db = await this.prisma.database.findFirst({
      where: { id, account: { ownerId: userId } },
      include: { server: true }
    });
    if (!db) throw new NotFoundException('Database not found');

    if (db.serverId) {
      // this.logsGateway.sendCommandToAgent(db.serverId, 'backup_db', db);
    }
    return { success: true, message: 'Backup initiated' };
  }
}
