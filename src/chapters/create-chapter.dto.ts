import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateChapterDto {
  @IsMongoId()
  subject: string;

  @IsString()
  @IsNotEmpty()
  title: string;
}
