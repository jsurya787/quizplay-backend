import { IsString, IsOptional, IsNumber } from 'class-validator';

export class HotTopicDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  priority: number;
}
