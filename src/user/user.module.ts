import { Module, forwardRef } from '@nestjs/common';
import { StudentController } from './student/student/student.controller';
import { AdminController } from './admin/admin/admin.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserService } from './user.service';
import { TeacherController } from './teacher/teacher.controller';
import { QuizModule } from 'src/quiz/quiz.module';
import { Institute, InstituteSchema } from './schemas/institute.schema';
import { MailModule } from 'src/mail/mail.module';



@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Institute.name, schema: InstituteSchema },
    ]),
    MailModule,
    forwardRef(() => QuizModule),
  ],
   controllers: [StudentController, AdminController, TeacherController],
  exports: [MongooseModule, UserService],
  providers: [UserService],
})
export class UserModule {}
