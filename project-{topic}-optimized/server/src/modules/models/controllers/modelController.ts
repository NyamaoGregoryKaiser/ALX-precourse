import { Request, Response, NextFunction } from 'express';
import * as modelService from '../services/modelService';
import asyncHandler from '../../../utils/asyncHandler';
import { CreateModelDto, UpdateModelDto } from '../../../types';
import { CreatedResponse, SuccessResponse, NoDataResponse } from '../../../utils/apiResponse';

export const getAllModels = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const models = await modelService.findAllModels();
  new SuccessResponse(res, 'Models retrieved successfully', models).send();
});

export const getModelById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const model = await modelService.findModelById(id);
  new SuccessResponse(res, 'Model retrieved successfully', model).send();
});

export const createModel = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const modelData: CreateModelDto = { ...req.body, createdBy: req.user }; // Attach user
  const newModel = await modelService.createModel(modelData);
  new CreatedResponse(res, 'Model created successfully', newModel).send();
});

export const updateModel = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const updateData: UpdateModelDto = req.body;
  const updatedModel = await modelService.updateModel(id, updateData);
  new SuccessResponse(res, 'Model updated successfully', updatedModel).send();
});

export const deleteModel = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  await modelService.deleteModel(id);
  new NoDataResponse(res, 'Model deleted successfully').send();
});
```