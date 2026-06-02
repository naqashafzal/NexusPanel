import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DatabasesService } from './databases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('databases')
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Get()
  findAll(@Request() req) {
    return this.databasesService.findAll(req.user.id);
  }

  @Post()
  create(@Body() createDto: any, @Request() req) {
    return this.databasesService.create(req.user.id, createDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.databasesService.remove(id, req.user.id);
  }

  @Post(':id/backup')
  backup(@Param('id') id: string, @Request() req) {
    return this.databasesService.backup(id, req.user.id);
  }
}
