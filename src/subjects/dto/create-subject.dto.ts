import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum SubjectType {
  ENTRANCE = 'entrance',
  GOVERNMENT = 'government',
  STATE = 'state',
  BORDS = 'bords',
}

export class CreateSubjectDto {
  @IsString()
  name: string;

  @IsEnum(SubjectType)
  type: SubjectType;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  priority: number;

  @IsString()
  subjectClass: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  })
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
