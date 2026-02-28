import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  title!: string;

  /* ✅ NEW */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'Description cannot exceed 200 characters' })
  description!: string;

  @IsMongoId()
  subjectId!: string;

  @IsEnum(['easy', 'medium', 'hard'])
  difficulty!: 'easy' | 'medium' | 'hard';

  @IsNumber()
  timeLimit!: number;

  @IsOptional()
  @IsEnum(['PUBLIC', 'RESTRICTED'])
  visibility?: 'PUBLIC' | 'RESTRICTED';
}
