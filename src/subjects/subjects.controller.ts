import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/auth/jwt/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/jwt/jwt/roles.guard';
import { SubjectsService } from './subjects.service';
import { Role } from 'src/auth/role/roles.enum';
import { Roles } from 'src/auth/role/roles.decorator';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('subjects')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  // ➕ CREATE SUBJECT (WITH LOGO)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/subjects',
        filename: (_req, file, cb) => {
          const unique =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files allowed'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 1024 * 1024, // 1MB
      },
    }),
  )
  create(
    @Body() body: CreateSubjectDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const logoUrl: any = file
      ? `https://quizplay.api.co.in/uploads/subjects/${file.filename}`
      : null;

    return this.subjectsService.create({
      ...body,
      logoUrl,
    });
  }

  // 📄 Get All Subjects
  @Get()
  findAll() {
    return this.subjectsService.findAll();
  }

  // 📄 Get Primary Subjects
  @Get('primary')
  findPrimarySubjects() {
    return this.subjectsService.findPrimarySubjects();
  }

  // ✏️ UPDATE SUBJECT (LOGO OPTIONAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/subjects',
        filename: (_req, file, cb) => {
          const unique =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  update(
    @Param('id') id: string,
    @Body() body: UpdateSubjectDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const logoUrl = file
      ? `https://quizplay.api.co.in/uploads/subjects/${file.filename}`
      : undefined;

    return this.subjectsService.update(id, {
      ...body,
      ...(logoUrl && { logoUrl }),
    });
  }

  // 🗑️ DELETE SUBJECT
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }
}
