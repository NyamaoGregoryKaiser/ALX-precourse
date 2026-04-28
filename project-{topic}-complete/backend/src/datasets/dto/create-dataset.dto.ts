import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateDatasetDto {
  @ApiProperty({ description: 'Name of the dataset', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Description of the dataset', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}