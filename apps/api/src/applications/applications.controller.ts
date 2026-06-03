import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
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

  // --- Specific sub-routes MUST come before @Get(':id') to avoid being swallowed ---

  @Get(':id/deploy-logs')
  getDeployLogs(@Param('id') id: string, @Request() req) {
    return this.applicationsService.getDeployLogs(id, req.user.id);
  }

  @Get(':id/url')
  getAppUrl(@Param('id') id: string, @Request() req) {
    return this.applicationsService.getAppUrl(id, req.user.id);
  }

  // --- Generic :id route ---

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
    if (!file) throw new BadRequestException('No file uploaded');
    return this.applicationsService.deployZip(id, req.user.id, file);
  }

  @Post(':id/github')
  deployGithub(@Param('id') id: string, @Body() body: { repoUrl: string; branch: string }, @Request() req) {
    return this.applicationsService.deployGithub(id, req.user.id, body.repoUrl, body.branch);
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    return this.applicationsService.update(id, req.user.id, updateDto);
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
