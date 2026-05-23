import { Request, Response, NextFunction } from 'express';
import * as preprocessingService from '../services/preprocessingService';
import asyncHandler from '../../../utils/asyncHandler';
import { BadRequestError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import fs from 'fs';
import { parseCsvData } from '../../../utils/csvParser';
import { PreprocessingTransformDto } from '../../../types';

export const transformData = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    logger.warn('Preprocessing transform failed: No file uploaded');
    throw new BadRequestError('No file uploaded for transformation.');
  }

  const { transformationType, columnName, outputFormat }: PreprocessingTransformDto = req.body;

  if (!transformationType) {
    logger.warn('Preprocessing transform failed: Missing transformationType');
    throw new BadRequestError('Transformation type is required.');
  }

  // Read and parse the uploaded CSV file
  const fileStream = fs.createReadStream(req.file.path);
  let data = await parseCsvData(fileStream);

  if (!data || data.length === 0) {
    logger.warn('Preprocessing transform failed: Uploaded CSV is empty');
    throw new BadRequestError('Uploaded CSV file is empty or could not be parsed.');
  }

  // Perform the transformation
  let transformedData: any[] | string;
  try {
    switch (transformationType) {
      case 'normalize':
        if (!columnName) throw new BadRequestError('columnName is required for normalization.');
        transformedData = preprocessingService.normalizeColumn(data, columnName);
        break;
      case 'standardize':
        if (!columnName) throw new BadRequestError('columnName is required for standardization.');
        transformedData = preprocessingService.standardizeColumn(data, columnName);
        break;
      case 'oneHotEncode':
        if (!columnName) throw new BadRequestError('columnName is required for one-hot encoding.');
        transformedData = preprocessingService.oneHotEncodeColumn(data, columnName);
        break;
      default:
        throw new BadRequestError(`Unsupported transformation type: ${transformationType}`);
    }
  } catch (error: any) {
    logger.error(`Transformation failed for type ${transformationType}: ${error.message}`);
    throw new BadRequestError(`Data transformation failed: ${error.message}`);
  }

  // Determine output format
  if (outputFormat === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transformed_${transformationType}.csv"`);
    res.send(preprocessingService.convertArrayOfObjectsToCsv(transformedData));
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.json(transformedData);
  }

  // Optionally, delete the uploaded file after processing
  fs.unlink(req.file.path, (err) => {
    if (err) logger.error(`Failed to delete uploaded file ${req.file?.path}: ${err.message}`);
  });
});
```