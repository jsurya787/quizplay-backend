import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class OptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Option text cannot exceed 100 characters' })
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class AddQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150, { message: 'Question cannot exceed 150 characters' })
  questionText: string;

  @IsArray()
  @ArrayMinSize(4, { message: 'Exactly 4 options are required' })
  @ArrayMaxSize(4, { message: 'Exactly 4 options are required' })
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];

  @IsInt()
  @Min(1)
  marks: number;
}
