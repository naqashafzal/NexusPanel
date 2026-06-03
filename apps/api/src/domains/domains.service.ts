import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DomainsService {
  constructor(private prisma: PrismaService) {}

  async findAll(applicationId: string, userId: string) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, account: { ownerId: userId } } });
    if (!app) throw new NotFoundException('Application not found');

    return this.prisma.domain.findMany({ where: { appId: applicationId } });
  }

  async create(applicationId: string, userId: string, data: { domain: string, type?: string }) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, account: { ownerId: userId } } });
    if (!app) throw new NotFoundException('Application not found');

    const existing = await this.prisma.domain.findUnique({ where: { domain: data.domain } });
    if (existing) throw new ConflictException('Domain is already registered on this platform');

    return this.prisma.domain.create({
      data: {
        domain: data.domain,
        type: data.type || 'ROOT',
        appId: applicationId,
        accountId: app.accountId,
      },
    });
  }

  async remove(id: string, userId: string) {
    const domain = await this.prisma.domain.findFirst({
      where: { id, account: { ownerId: userId } }
    });
    if (!domain) throw new NotFoundException('Domain not found');

    return this.prisma.domain.delete({
      where: { id },
    });
  }
}
