import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

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

  async update(id: string, userId: string, data: any) {
    const app = await this.prisma.application.findFirst({
      where: { id, account: { ownerId: userId } }
    });
    if (!app) throw new NotFoundException('Application not found');

    return this.prisma.application.update({
      where: { id },
      data: {
        pythonVersion: data.pythonVersion,
        appRoot: data.appRoot,
        startupFile: data.startupFile,
        entryPoint: data.entryPoint
      }
    });
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
        branch,
        status: 'deploying'
      }
    });

    try {
      // Trigger the physical Docker build engine on the agent
      const agentUrl = `http://${app.server!.ipAddress}:4001`;
      await axios.post(`${agentUrl}/deploy/github`, {
        repoUrl,
        branch,
        appName: app.slug,
        appType: app.type,
        pythonVersion: app.pythonVersion,
        appRoot: app.appRoot,
        startupFile: app.startupFile,
        entryPoint: app.entryPoint
      });

      // If successful, update status to running
      await this.prisma.application.update({
        where: { id },
        data: { status: 'running' }
      });
    } catch (e) {
      console.error('Failed to trigger agent deployment', e);
      await this.prisma.application.update({
        where: { id },
        data: { status: 'stopped' }
      });
      throw new BadRequestException('Agent deployment failed');
    }

    return updatedApp;
  }

  async deployZip(id: string, userId: string, file: Express.Multer.File) {
    const app = await this.prisma.application.findFirst({
      where: { id, account: { ownerId: userId } },
      include: { server: true }
    });
    if (!app) throw new NotFoundException('Application not found');

    const updatedApp = await this.prisma.application.update({
      where: { id },
      data: {
        deployMethod: 'zip',
        status: 'deploying'
      }
    });

    try {
      const agentUrl = `http://${app.server!.ipAddress}:4001`;
      
      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(file.buffer)]), file.originalname);
      formData.append('appName', app.slug);
      formData.append('appType', app.type);
      if (app.pythonVersion) formData.append('pythonVersion', app.pythonVersion);
      if (app.appRoot) formData.append('appRoot', app.appRoot);
      if (app.startupFile) formData.append('startupFile', app.startupFile);
      if (app.entryPoint) formData.append('entryPoint', app.entryPoint);

      await axios.post(`${agentUrl}/deploy/zip`, formData);

      await this.prisma.application.update({
        where: { id },
        data: { status: 'running' }
      });
    } catch (e) {
      console.error('Failed to trigger agent zip deployment', e);
      await this.prisma.application.update({
        where: { id },
        data: { status: 'stopped' }
      });
      throw new BadRequestException('Agent deployment failed');
    }

    return updatedApp;
  }

  async getDeployLogs(id: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, account: { ownerId: userId } },
      include: { server: true }
    });
    if (!app) throw new NotFoundException('Application not found');

    try {
      const agentUrl = `http://${app.server!.ipAddress}:4001`;
      const res = await axios.get(`${agentUrl}/deploy/logs/${app.slug}`);
      return { logs: res.data };
    } catch (e) {
      return { logs: 'Could not fetch logs from agent...' };
    }
  }

  async getAppUrl(id: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, account: { ownerId: userId } },
      include: { server: true }
    });
    if (!app) throw new NotFoundException('Application not found');

    try {
      const agentUrl = `http://${app.server!.ipAddress}:4001`;
      const res = await axios.get(`${agentUrl}/app-port/${app.slug}`);
      const port = res.data.port;
      const url = `http://${app.server!.ipAddress}:${port}`;
      return { url, port };
    } catch (e) {
      return { url: null, port: null };
    }
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
