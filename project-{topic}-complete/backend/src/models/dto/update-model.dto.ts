import { PartialType } from '@nestjs/swagger';
import { CreateModelDto } from './create-model.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean, Matches } from 'class-validator';

export class UpdateModelDto extends PartialType(CreateModelDto) {
  @ApiProperty({ description: 'Name of the ML model', maxLength: 255, required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Description of the model', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Version of the model (e.g., v1.0, 1.0.0)', maxLength: 50, required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^v?\d+(\.\d+){0,2}$/, { message: 'Version must be in format like v1.0 or 1.0.0' })
  version?: string;

  @ApiProperty({ description: 'Whether the model is deployed or not', required: false })
  @IsOptional()
  @IsBoolean()
  deployed?: boolean;

  @ApiProperty({ description: 'URL for the deployed model prediction endpoint (if deployed externally)', required: false })
  @IsOptional()
  @IsString()
  deploymentUrl?: string;
}