import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    const isSetup = await this.prisma.setting.findUnique({
      where: { key: 'is_setup_complete' },
    });
    
    const adminCount = await this.prisma.user.count({
      where: { role: 'SUPER_ADMIN' }
    });

    return {
      isSetupComplete: isSetup?.value === 'true' && adminCount > 0,
    };
  }

  async finalize(data: any) {
    await this.prisma.setting.upsert({
      where: { key: 'is_setup_complete' },
      update: { value: 'true' },
      create: { key: 'is_setup_complete', value: 'true' },
    });

    if (data.serverName) {
      await this.prisma.setting.upsert({
        where: { key: 'server_name' },
        update: { value: data.serverName },
        create: { key: 'server_name', value: data.serverName },
      });
    }

    return { success: true };
  }
}
