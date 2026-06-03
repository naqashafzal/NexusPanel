import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ServersService } from './servers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Get()
  findAll() {
    return this.serversService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; ipAddress: string }) {
    return this.serversService.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serversService.remove(id);
  }
}
