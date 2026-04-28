import { Module } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PredictionsController } from './predictions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionLog } from './entities/prediction-log.entity';
import { ModelsModule } from '../models/models.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PredictionLog]), ModelsModule, AuthModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
})
export class PredictionsModule {}