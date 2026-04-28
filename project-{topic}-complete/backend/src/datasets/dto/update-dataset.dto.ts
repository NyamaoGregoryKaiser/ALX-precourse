import { PartialType } from '@nestjs/swagger';
import { CreateDatasetDto } from './create-dataset.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class UpdateDatasetDto extends PartialType(CreateDatasetDto) {
  @ApiProperty({ description: 'Name of the dataset', maxLength: 255, required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Description of the dataset', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}