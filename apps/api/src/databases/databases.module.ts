import { Module } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule],
  providers: [DatabasesService],
  controllers: [DatabasesController],
  exports: [DatabasesService],
})
export class DatabasesModule {}
