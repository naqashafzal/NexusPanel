import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EnvService } from './env.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('applications/:appId/env')
export class EnvController {
  constructor(private readonly envService: EnvService) {}

  @Get()
  findAll(@Param('appId') appId: string, @Request() req) {
    return this.envService.findAll(appId, req.user.id);
  }

  @Post()
  createOrUpdate(@Param('appId') appId: string, @Body() body: { variables: { key: string, value: string }[] }, @Request() req) {
    return this.envService.createOrUpdate(appId, req.user.id, body.variables);
  }

  @Delete(':id')
  remove(@Param('appId') appId: string, @Param('id') id: string, @Request() req) {
    return this.envService.remove(id, appId, req.user.id);
  }
}
