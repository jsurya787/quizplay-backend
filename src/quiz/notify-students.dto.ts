import { IsBoolean, IsOptional } from 'class-validator';

export class NotifyStudentsDto {
  @IsOptional()
  @IsBoolean()
  sendToAll?: boolean;
}
