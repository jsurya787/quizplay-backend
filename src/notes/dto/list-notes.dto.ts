import { IsOptional, IsString } from 'class-validator';

export class ListNotesDto {
  @IsOptional()
  @IsString()
  search?: string;
}
