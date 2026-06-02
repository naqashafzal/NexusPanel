import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { WebhooksController } from './webhooks.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  providers: [ApplicationsService],
  controllers: [ApplicationsController, WebhooksController],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
