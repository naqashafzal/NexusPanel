import { Controller, Post, Headers, Body, RawBodyRequest, Req, BadRequestException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import type { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly prisma: PrismaService
  ) {}

  @Post('github')
  async handleGithubPush(
    @Headers('x-hub-signature-256') signature: string,
    @Body() payload: any,
    @Req() req: any
  ) {
    if (!signature) throw new BadRequestException('No signature found');
    
    const repoUrl = payload.repository?.clone_url;
    if (!repoUrl) return { message: 'Ignored: No repository URL in payload' };

    const apps = await this.prisma.application.findMany({
      where: { repoUrl }
    });

    if (apps.length === 0) return { message: 'No applications found for this repository' };

    for (const app of apps) {
      const account = await this.prisma.account.findUnique({ where: { id: app.accountId } });
      if (account) {
        await this.applicationsService.executeCommand(app.id, account.ownerId, 'deploy_app');
      }
    }

    return { message: 'Deployments triggered', count: apps.length };
  }
}
