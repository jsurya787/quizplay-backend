import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateSignatureDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9/_-]+$/, {
    message: 'folder contains invalid characters',
  })
  folder?: string;
}

