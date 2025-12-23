import { Module } from '@nestjs/common';
import { StudentController } from './student/student/student.controller';
import { AdminController } from './admin/admin/admin.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserService } from './user.service';




@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
   controllers: [StudentController, AdminController],
  exports: [MongooseModule, UserService],
  providers: [UserService],
})
export class UserModule {}

