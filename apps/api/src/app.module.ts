import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SetupModule } from './setup/setup.module';
import { ApplicationsModule } from './applications/applications.module';
import { DomainsModule } from './domains/domains.module';
import { EnvModule } from './env/env.module';
import { DatabasesModule } from './databases/databases.module';
import { ServersModule } from './servers/servers.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    SetupModule,
    ApplicationsModule,
    DomainsModule,
    EnvModule,
    DatabasesModule,
    ServersModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
