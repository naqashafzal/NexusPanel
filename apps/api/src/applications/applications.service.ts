import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.application.findMany({
      where: { account: { ownerId: userId } },
      include: { server: true }
    });
  }

  async findOne(id: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, account: { ownerId: userId } },
      include: { server: true, envVars: true, domains: true }
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
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

    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const app = await this.prisma.application.create({
      data: {
        ...data,
        slug,
        deployMethod: data.deployMethod || 'zip',
        accountId: account.id,
      },
    });

    // this.logsGateway.sendCommandToAgent(server.id, 'deploy_app', app);

    return app;
  }

  async executeCommand(id: string, userId: string, command: string, payload?: any) {
    const app = await this.prisma.application.findFirst({
      where: { id, account: { ownerId: userId } },
      include: { server: true }
    });
    if (!app) throw new NotFoundException('Application not found');

    // this.logsGateway.sendCommandToAgent(app.server!.id, command, payload || { slug: app.slug });
    return { success: true, message: `Command ${command} sent to Agent` };
  }

  async deployGithub(id: string, userId: string, repoUrl: string, branch: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, account: { ownerId: userId } },
      include: { server: true }
    });
    if (!app) throw new NotFoundException('Application not found');

    const updatedApp = await this.prisma.application.update({
      where: { id },
      data: {
        deployMethod: 'github',
        repoUrl,
        branch
      }
    });

    // this.logsGateway.sendCommandToAgent(app.server!.id, 'deploy_app_github', { repoUrl, branch });

    return updatedApp;
  }

  async remove(id: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, account: { ownerId: userId } },
      include: { server: true }
    });
    if (!app) throw new NotFoundException('Application not found');

    // this.logsGateway.sendCommandToAgent(app.server!.id, 'delete_app', { slug: app.slug });

    return this.prisma.application.delete({
      where: { id: app.id },
    });
  }
}
