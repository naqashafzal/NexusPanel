import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SetupModule } from './setup/setup.module';
import { ApplicationsModule } from './applications/applications.module';
import { AgentModule } from './agent/agent.module';
import { DomainsModule } from './domains/domains.module';
import { EnvModule } from './env/env.module';
import { LogsModule } from './logs/logs.module';
import { DatabasesModule } from './databases/databases.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    SetupModule,
    ApplicationsModule,
    AgentModule,
    DomainsModule,
    EnvModule,
    LogsModule,
    DatabasesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
