import {
  IsMongoId,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SectionDto } from './section.dto';

export class CreateChapterDto {
  @IsMongoId()
  subjectId: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  order: number;

  @IsBoolean()
  isActive: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];
}
