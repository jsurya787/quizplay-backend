import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestSession, GuestSessionSchema } from './guest-session.schema';
import { GuestSessionService } from './guest-session.service';
import { GuestSessionGuard } from './guest-session.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestSession.name, schema: GuestSessionSchema },
    ]),
  ],
  providers: [GuestSessionService, GuestSessionGuard],
  exports: [GuestSessionService, GuestSessionGuard],
})
export class GuestSessionModule {}
