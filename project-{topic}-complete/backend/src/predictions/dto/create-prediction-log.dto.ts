import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class CreatePredictionLogDto {
  @ApiProperty({ description: 'Input data sent for prediction', example: { feature1: 10, feature2: 'test' } })
  @IsObject()
  @IsNotEmpty()
  inputData: Record<string, any>;

  @ApiProperty({ description: 'Output data received from prediction', example: { prediction: 0.85, class: 'A' } })
  @IsObject()
  @IsNotEmpty()
  outputData: Record<string, any>;
}