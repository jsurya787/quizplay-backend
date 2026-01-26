import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class UpdateChapterDto {

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
