import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MicrosoftAuthGuard } from './microsoft-auth.guard';
import type { MicrosoftAuthenticatedRequest } from './microsoft-auth.guard';

@Controller('microsoft-auth-test')
export class MicrosoftAuthController {
  @Get('profile')
  @UseGuards(MicrosoftAuthGuard)
  getProfile(@Req() request: MicrosoftAuthenticatedRequest) {
    return {
      success: true,
      message: 'Microsoft access token verified',
      user: request.microsoftUser,
    };
  }
}