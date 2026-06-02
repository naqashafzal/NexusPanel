import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DomainsService } from './domains.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('applications/:appId/domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  findAll(@Param('appId') appId: string, @Request() req) {
    return this.domainsService.findAll(appId, req.user.id);
  }

  @Post()
  create(@Param('appId') appId: string, @Body() createDto: any, @Request() req) {
    return this.domainsService.create(appId, req.user.id, createDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.domainsService.remove(id, req.user.id);
  }
}
