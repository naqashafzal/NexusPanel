import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DomainsService {
  constructor(private prisma: PrismaService) {}

  async findAll(applicationId: string, userId: string) {
    // Validate app ownership
    const app = await this.prisma.application.findUnique({ where: { id: applicationId, userId } });
    if (!app) throw new NotFoundException('Application not found');

    return this.prisma.domain.findMany({ where: { applicationId } });
  }

  async create(applicationId: string, userId: string, data: { domain: string, type?: string }) {
    // Validate app ownership
    const app = await this.prisma.application.findUnique({ where: { id: applicationId, userId } });
    if (!app) throw new NotFoundException('Application not found');

    // Check if domain exists globally
    const existing = await this.prisma.domain.findUnique({ where: { domain: data.domain } });
    if (existing) throw new ConflictException('Domain is already registered on this platform');

    return this.prisma.domain.create({
      data: {
        domain: data.domain,
        type: data.type || 'ROOT',
        applicationId,
        serverId: app.serverId,
        userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.domain.delete({
      where: { id, userId },
    });
  }
}
