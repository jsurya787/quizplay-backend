import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Title cannot exceed 120 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Content cannot be empty' })
  @MaxLength(10000, { message: 'Content cannot exceed 10,000 characters' })
  content?: string;
}
