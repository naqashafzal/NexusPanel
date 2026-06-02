import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  findAll(@Request() req) {
    return this.applicationsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.applicationsService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() createDto: any, @Request() req) {
    return this.applicationsService.create(req.user.id, createDto);
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZip(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req) {
    // Save to some persistent storage, e.g. S3, or locally
    // For MVP, we pretend it's saved locally and pass the URL to the Agent
    const mockFileUrl = `http://localhost:4000/uploads/${file.originalname}`;
    return this.applicationsService.executeCommand(id, req.user.id, 'deploy_app_zip', { zipUrl: mockFileUrl });
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Request() req) {
    return this.applicationsService.executeCommand(id, req.user.id, 'start_app');
  }

  @Post(':id/stop')
  stop(@Param('id') id: string, @Request() req) {
    return this.applicationsService.executeCommand(id, req.user.id, 'stop_app');
  }

  @Post(':id/restart')
  restart(@Param('id') id: string, @Request() req) {
    return this.applicationsService.executeCommand(id, req.user.id, 'restart_app');
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.applicationsService.remove(id, req.user.id);
  }
}
