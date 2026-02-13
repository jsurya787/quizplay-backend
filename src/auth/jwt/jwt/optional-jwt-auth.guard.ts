import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // ❌ Do NOT throw if no token / invalid token
    if (err) {
      return null;
    }

    // ✅ Logged-in → user object
    // ✅ Not logged-in → null
    return user ?? null;
  }
}
