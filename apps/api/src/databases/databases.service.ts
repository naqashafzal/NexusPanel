import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoUtil } from '../utils/crypto.util';
import { LogsGateway } from '../logs/logs.gateway';

@Injectable()
export class DatabasesService {
  constructor(private prisma: PrismaService, private logsGateway: LogsGateway) {}

  async findAll(userId: string) {
    return this.prisma.database.findMany({
      where: { userId },
      include: { server: true }
    });
  }

  async create(userId: string, data: any) {
    // Validate server ownership
    const server = await this.prisma.server.findUnique({
      where: { id: data.serverId, userId }
    });
    if (!server) throw new BadRequestException('Invalid server selected');

    // Generate a secure random password for the DB
    const randomPassword = require('crypto').randomBytes(16).toString('hex');
    const encryptedPassword = CryptoUtil.encrypt(randomPassword);

    // Default ports based on type
    let port = 5432;
    if (data.type === 'MYSQL') port = 3306;
    if (data.type === 'REDIS') port = 6379;
    if (data.type === 'MONGODB') port = 27017;

    return this.prisma.database.create({
      data: {
        name: data.name,
        type: data.type,
        internalPort: port,
        dbUser: data.type === 'REDIS' ? null : 'nexusadmin',
        encryptedPassword,
        serverId: data.serverId,
        userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.database.delete({
      where: { id, userId },
    });
  }

  async backup(id: string, userId: string) {
    const db = await this.prisma.database.findUnique({
      where: { id, userId },
      include: { server: true }
    });
    if (!db) throw new NotFoundException('Database not found');

    // Trigger backup command on the Agent
    this.logsGateway.sendCommandToAgent(db.server.id, 'backup_db', db);
    return { success: true, message: 'Backup initiated' };
  }
}
