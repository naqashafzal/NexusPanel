import { Module } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';

@Module({
  imports: [],
  providers: [DatabasesService],
  controllers: [DatabasesController],
  exports: [DatabasesService],
})
export class DatabasesModule {}
