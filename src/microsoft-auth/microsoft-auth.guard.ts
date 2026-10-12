import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { MicrosoftUserClaims } from './microsoft-auth.constants';

export interface MicrosoftAuthenticatedRequest extends Request {
  microsoftUser?: MicrosoftUserClaims;
}

@Injectable()
export class MicrosoftAuthGuard implements CanActivate {
  constructor(private readonly microsoftAuthService: MicrosoftAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MicrosoftAuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      throw new UnauthorizedException('Bearer access token required');
    }

    request.microsoftUser = await this.microsoftAuthService.verifyAccessToken(match[1]);
    return true;
  }
}