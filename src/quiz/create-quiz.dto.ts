import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  /* ✅ NEW */
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description: string;

  @IsMongoId()
  subjectId: string;

  @IsEnum(['easy', 'medium', 'hard'])
  difficulty: 'easy' | 'medium' | 'hard';

  @IsNumber()
  timeLimit: number;
}
