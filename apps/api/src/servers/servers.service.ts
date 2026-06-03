import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ServersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.server.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: { name: string; ipAddress: string }) {
    const agentToken = crypto.randomBytes(32).toString('hex');
    return this.prisma.server.create({
      data: {
        name: data.name,
        ipAddress: data.ipAddress,
        agentToken,
        status: 'installing'
      }
    });
  }

  async remove(id: string) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundException('Server not found');

    return this.prisma.server.delete({
      where: { id }
    });
  }
}
