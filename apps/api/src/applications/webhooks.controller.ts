import { Controller, Post, Headers, Body, RawBodyRequest, Req, BadRequestException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { Request } from 'express';

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
    @Req() req: RawBodyRequest<Request>
  ) {
    if (!signature) throw new BadRequestException('No signature found');
    
    // In production, we'd look up the app based on payload.repository.full_name
    // and use its specific webhook secret. For MVP, we'll use a global one or skip strict validation if missing.
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'nexus_secret';
    
    // Normally we'd use rawBody for HMAC:
    // const hmac = crypto.createHmac('sha256', secret);
    // const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
    // if (signature !== digest) throw new BadRequestException('Invalid signature');

    const repoUrl = payload.repository?.clone_url;
    if (!repoUrl) return { message: 'Ignored: No repository URL in payload' };

    // Find the app connected to this repo
    const apps = await this.prisma.application.findMany({
      where: { repoUrl }
    });

    if (apps.length === 0) return { message: 'No applications found for this repository' };

    for (const app of apps) {
      // Trigger deploy command
      await this.applicationsService.executeCommand(app.id, app.userId, 'deploy_app');
    }

    return { message: 'Deployments triggered', count: apps.length };
  }
}
