import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class PredictModelDto {
  @ApiProperty({ description: 'Input data for the model to make a prediction', example: { feature_a: 1.2, feature_b: 'categoryX' } })
  @IsObject()
  @IsNotEmpty()
  inputData: Record<string, any>;
}