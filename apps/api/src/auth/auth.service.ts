import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('User already exists');
    
    const hashedPassword = await argon2.hash(data.password);
    
    // For MVP, first user is SUPER_ADMIN, others are HOSTING_USER
    const count = await this.prisma.user.count();
    const role = count === 0 ? 'SUPER_ADMIN' : 'HOSTING_USER';

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role,
      },
    });
    
    return this.generateTokens(user);
  }

  async login(data: any) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const valid = await argon2.verify(user.password, data.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    
    return this.generateTokens(user);
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    };
  }
}
