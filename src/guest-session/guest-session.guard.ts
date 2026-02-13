import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GuestSessionService } from './guest-session.service';

@Injectable()
export class GuestSessionGuard implements CanActivate {
  constructor(private readonly guestSessionService: GuestSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 🍪 Extract session token from HTTP-only cookie
    const sessionToken = request.cookies?.['guest_session'];

    if (!sessionToken) {
      throw new UnauthorizedException(
        'Guest session required. Please start a quiz first.',
      );
    }

    // ✅ Validate session
    const session = await this.guestSessionService.validateSession(sessionToken);

    // 📎 Attach session to request for use in controllers
    request.guestSession = session;

    return true;
  }
}
