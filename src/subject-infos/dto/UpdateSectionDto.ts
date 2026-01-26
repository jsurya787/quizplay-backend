import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSectionDto {
  @IsNumber()
  order: number; // REQUIRED to identify section

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
