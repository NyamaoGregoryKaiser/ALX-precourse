import { Request, Response, NextFunction } from 'express';
import * as datasetService from '../services/datasetService';
import asyncHandler from '../../../utils/asyncHandler';
import { CreateDatasetDto, UpdateDatasetDto } from '../../../types';
import { CreatedResponse, SuccessResponse, NoDataResponse } from '../../../utils/apiResponse';
import { BadRequestError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import fs from 'fs';
import { parseCsvSchema } from '../../../utils/csvParser';
import path from 'path';

export const getAllDatasets = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const datasets = await datasetService.findAllDatasets();
  new SuccessResponse(res, 'Datasets retrieved successfully', datasets).send();
});

export const getDatasetById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const dataset = await datasetService.findDatasetById(id);
  new SuccessResponse(res, 'Dataset retrieved successfully', dataset).send();
});

export const createDataset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    logger.warn('Dataset creation failed: No file uploaded');
    throw new BadRequestError('No file uploaded.');
  }

  const { name, description }: CreateDatasetDto = req.body;
  const fileUrl = path.join('/uploads', req.file.filename); // Store as a relative path for now

  // Parse CSV schema
  const fileStream = fs.createReadStream(req.file.path);
  const schemaJson = await parseCsvSchema(fileStream);
  logger.info(`Schema parsed for ${req.file.filename}: ${JSON.stringify(schemaJson)}`);

  const newDataset = await datasetService.createDataset({
    name,
    description,
    fileUrl,
    schemaJson,
    createdBy: req.user,
  });

  new CreatedResponse(res, 'Dataset created successfully', newDataset).send();
});

export const updateDataset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const updateData: UpdateDatasetDto = req.body;
  const updatedDataset = await datasetService.updateDataset(id, updateData);
  new SuccessResponse(res, 'Dataset updated successfully', updatedDataset).send();
});

export const deleteDataset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  await datasetService.deleteDataset(id);
  new NoDataResponse(res, 'Dataset deleted successfully').send();
});
```