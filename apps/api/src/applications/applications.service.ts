import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsGateway } from '../logs/logs.gateway';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService, private logsGateway: LogsGateway) {}

  async findAll(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: { server: true }
    });
  }

  async findOne(id: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id, userId },
      include: { server: true, envVars: true, domains: true }
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async create(userId: string, data: any) {
    const server = await this.prisma.server.findUnique({
      where: { id: data.serverId, userId }
    });
    if (!server) throw new BadRequestException('Invalid server selected');

    const app = await this.prisma.application.create({
      data: {
        ...data,
        userId,
      },
    });

    // Deploy immediately after creation
    this.logsGateway.sendCommandToAgent(server.id, 'deploy_app', app);

    return app;
  }

  async executeCommand(id: string, userId: string, command: string, payload?: any) {
    const app = await this.prisma.application.findUnique({
      where: { id, userId },
      include: { server: true }
    });
    if (!app) throw new NotFoundException('Application not found');

    this.logsGateway.sendCommandToAgent(app.server.id, command, payload || { slug: app.slug });
    return { success: true, message: `Command ${command} sent to Agent` };
  }

  async remove(id: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id, userId },
      include: { server: true }
    });
    if (!app) throw new NotFoundException('Application not found');

    this.logsGateway.sendCommandToAgent(app.server.id, 'delete_app', { slug: app.slug });

    return this.prisma.application.delete({
      where: { id, userId },
    });
  }
}
