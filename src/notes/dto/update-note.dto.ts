import {
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Title cannot exceed 120 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Content cannot be empty' })
  @MaxLength(10000, { message: 'Content cannot exceed 10,000 characters' })
  content?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPinned?: boolean;
}
