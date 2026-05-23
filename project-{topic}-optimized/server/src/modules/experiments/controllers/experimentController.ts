import { Request, Response, NextFunction } from 'express';
import * as experimentService from '../services/experimentService';
import asyncHandler from '../../../utils/asyncHandler';
import { CreateExperimentDto, UpdateExperimentDto } from '../../../types';
import { CreatedResponse, SuccessResponse, NoDataResponse } from '../../../utils/apiResponse';

export const getAllExperiments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const experiments = await experimentService.findAllExperiments();
  new SuccessResponse(res, 'Experiment runs retrieved successfully', experiments).send();
});

export const getExperimentById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const experiment = await experimentService.findExperimentById(id);
  new SuccessResponse(res, 'Experiment run retrieved successfully', experiment).send();
});

export const createExperiment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const experimentData: CreateExperimentDto = { ...req.body, createdBy: req.user }; // Attach user
  const newExperiment = await experimentService.createExperiment(experimentData);
  new CreatedResponse(res, 'Experiment run created successfully', newExperiment).send();
});

export const updateExperiment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const updateData: UpdateExperimentDto = req.body;
  const updatedExperiment = await experimentService.updateExperiment(id, updateData);
  new SuccessResponse(res, 'Experiment run updated successfully', updatedExperiment).send();
});

export const deleteExperiment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  await experimentService.deleteExperiment(id);
  new NoDataResponse(res, 'Experiment run deleted successfully').send();
});
```