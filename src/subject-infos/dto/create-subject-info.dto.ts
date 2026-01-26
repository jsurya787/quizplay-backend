import { IsMongoId, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HotTopicDto } from './hot-topic.dto';

export class CreateSubjectInfoDto {
  @IsMongoId()
  subjectId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HotTopicDto)
  hotTopics: HotTopicDto[];
}
