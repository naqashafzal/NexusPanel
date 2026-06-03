import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async listFiles(@Query('path') path: string) {
    return this.filesService.listFiles(path || '/');
  }

  @Get('read')
  async readFile(@Query('path') path: string) {
    const content = await this.filesService.readFile(path);
    return { content };
  }

  @Post('write')
  async writeFile(@Body() body: { path: string; content: string }) {
    return this.filesService.writeFile(body.path, body.content);
  }
}
