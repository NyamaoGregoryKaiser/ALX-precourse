import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PredictionLog } from './entities/prediction-log.entity';
import { ModelsService } from '../models/models.service';
import { Role } from '../common/enums/role.enum';
import { AppLogger } from '../common/logger/app-logger.service';

@Injectable()
export class PredictionsService {
  constructor(
    @InjectRepository(PredictionLog)
    private predictionLogsRepository: Repository<PredictionLog>,
    private modelsService: ModelsService,
    private readonly logger: AppLogger,
  ) {}

  async makePrediction(modelId: string, inputData: Record<string, any>, userId: string, userRole: Role): Promise<Record<string, any>> {
    this.logger.log(`User ${userId} attempting to make prediction with model ${modelId}`, PredictionsService.name);

    const model = await this.modelsService.findOne(modelId, userId, userRole); // Ensures model exists and user has access

    if (!model.deployed) {
      throw new BadRequestException(`Model "${model.name}" (ID: ${modelId}) is not deployed and cannot be used for predictions.`);
    }

    // --- Simulate ML Model Inference ---
    // In a real-world scenario, this would involve:
    // 1. Loading the model file from `model.filePath` (if local) or
    // 2. Making an HTTP request to `model.deploymentUrl` (if deployed externally).
    // 3. Validating and transforming `inputData` according to the model's expected schema.
    // 4. Executing the model's predict method.
    // 5. Handling potential inference errors.

    // For this project, we'll simulate a simple prediction
    const simulatedPrediction = this.simulatePrediction(inputData);
    // --- End Simulation ---

    // Log the prediction request
    const predictionLog = this.predictionLogsRepository.create({
      modelId: model.id,
      inputData,
      outputData: simulatedPrediction,
      requestedById: userId,
    });
    await this.predictionLogsRepository.save(predictionLog);
    this.logger.log(`Prediction logged for model ${modelId} by user ${userId}`, PredictionsService.name);

    return simulatedPrediction;
  }

  // A very basic simulated prediction logic
  private simulatePrediction(input: Record<string, any>): Record<string, any> {
    const output: Record<string, any> = {};

    // Example: If input has a 'value' field, return a processed 'result'
    if (typeof input.value === 'number') {
      output.result = input.value * 2 + Math.random();
      output.class = output.result > 10 ? 'High' : 'Low';
    } else if (typeof input.text === 'string') {
      output.sentiment = input.text.length > 10 ? 'positive' : 'negative';
      output.wordCount = input.text.split(' ').length;
    } else {
      output.message = 'No specific prediction logic for this input type. Returning dummy data.';
      output.dummy_prediction = Math.random();
    }

    return output;
  }

  async findAllLogs(): Promise<PredictionLog[]> {
    this.logger.log('Fetching all prediction logs (Admin access)', PredictionsService.name);
    return this.predictionLogsRepository.find({ relations: ['model', 'requestedBy'] });
  }

  async findLogsByModel(modelId: string, userId: string, userRole: Role): Promise<PredictionLog[]> {
    this.logger.log(`Fetching prediction logs for model ${modelId} by user ${userId} with role ${userRole}`, PredictionsService.name);
    
    // Ensure the model exists and the user has access to it
    await this.modelsService.findOne(modelId, userId, userRole);

    return this.predictionLogsRepository.find({
      where: { modelId: modelId },
      relations: ['requestedBy'], // Load the user who requested the prediction
      order: { requestedAt: 'DESC' },
    });
  }
}