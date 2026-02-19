import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTeacherInstituteDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  about?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;
}
