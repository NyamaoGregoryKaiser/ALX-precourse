import { Controller, Post, Body, Param, UseGuards, Request, Get } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PredictModelDto } from './dto/predict-model.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { PredictionLog } from './entities/prediction-log.entity';

@ApiTags('predictions')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post(':modelId')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Make a prediction using a deployed model' })
  @ApiResponse({ status: 200, description: 'Prediction result and logged.', type: Object, schema: { example: { prediction: 0.75 } } })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., model not deployed, invalid input).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not model owner or admin).' })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  predict(
    @Param('modelId') modelId: string,
    @Body() predictModelDto: PredictModelDto,
    @Request() req,
  ) {
    return this.predictionsService.makePrediction(modelId, predictModelDto.inputData, req.user.id, req.user.role);
  }

  @Get('logs')
  @Roles(Role.Admin) // Only admin can view all prediction logs
  @ApiOperation({ summary: 'Get all prediction logs (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all prediction logs.', type: [PredictionLog] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAllLogs() {
    return this.predictionsService.findAllLogs();
  }

  @Get('logs/:modelId')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Get prediction logs for a specific model' })
  @ApiResponse({ status: 200, description: 'List of prediction logs for the model.', type: [PredictionLog] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  findLogsByModel(@Param('modelId') modelId: string, @Request() req) {
    return this.predictionsService.findLogsByModel(modelId, req.user.id, req.user.role);
  }
}