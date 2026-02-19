import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  sex?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  about?: string;
}
