import { IsString, IsNumber, IsBoolean } from 'class-validator';

export class SectionDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  type: string;

  @IsNumber()
  order: number;

  @IsBoolean()
  isActive: boolean;
}
