import { Controller, Get, Post, Body } from '@nestjs/common';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  async getStatus() {
    return this.setupService.getStatus();
  }

  @Post('finalize')
  async finalize(@Body() body: any) {
    return this.setupService.finalize(body);
  }
}
