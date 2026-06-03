import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoUtil } from '../utils/crypto.util';

@Injectable()
export class EnvService {
  constructor(private prisma: PrismaService) {}

  async findAll(applicationId: string, userId: string) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, account: { ownerId: userId } } });
    if (!app) throw new NotFoundException('Application not found');

    const vars = await this.prisma.environmentVariable.findMany({ where: { applicationId } });
    
    // We do NOT decrypt values when sending them to the frontend to prevent unauthorized access.
    // They are only decrypted by the Agent deployment payload.
    return vars.map(v => ({
      id: v.id,
      key: v.key,
      // Masking the value
      value: '********'
    }));
  }

  async createOrUpdate(applicationId: string, userId: string, variables: { key: string, value: string }[]) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, account: { ownerId: userId } } });
    if (!app) throw new NotFoundException('Application not found');

    const results: any[] = [];
    for (const v of variables) {
      const encryptedValue = CryptoUtil.encrypt(v.value);
      
      const existing = await this.prisma.environmentVariable.findFirst({
        where: { applicationId, key: v.key }
      });

      if (existing) {
        const updated = await this.prisma.environmentVariable.update({
          where: { id: existing.id },
          data: { value: encryptedValue },
        });
        results.push(updated);
      } else {
        const created = await this.prisma.environmentVariable.create({
          data: {
            key: v.key,
            value: encryptedValue,
            applicationId,
          },
        });
        results.push(created);
      }
    }
    return { success: true, count: results.length };
  }

  async remove(id: string, applicationId: string, userId: string) {
    const app = await this.prisma.application.findFirst({ where: { id: applicationId, account: { ownerId: userId } } });
    if (!app) throw new NotFoundException('Application not found');

    return this.prisma.environmentVariable.delete({
      where: { id },
    });
  }
}
