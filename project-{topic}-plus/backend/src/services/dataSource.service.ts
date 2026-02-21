```typescript
import { AppDataSource } from '../dataSource';
import { DataSource } from '../entities/DataSource';
import { AppError } from '../utils/appError';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

const dataSourceRepository = AppDataSource.getRepository(DataSource);

export const createDataSource = async (userId: string, data: Partial<DataSource>): Promise<DataSource> => {
  const newDataSource = dataSourceRepository.create({ ...data, userId });
  try {
    return await dataSourceRepository.save(newDataSource);
  } catch (error: any) {
    logger.error(`Failed to create data source: ${error.message}`, { userId, data, error });
    throw new AppError('Failed to create data source', 500);
  }
};

export const createCsvDataSource = async (
  userId: string,
  name: string,
  description: string,
  filePath: string,
  originalFileName: string
): Promise<DataSource> => {
  // Store the CSV file permanently and update filePath in DB, or store content directly.
  // For simplicity, we'll assume `filePath` points to where the file should be kept.
  // In a real app, you might move it to a cloud storage (S3) or a persistent local folder.
  const permanentFilePath = path.join(process.cwd(), 'data_uploads', `${userId}_${Date.now()}_${originalFileName}`);
  
  if (!fs.existsSync(path.dirname(permanentFilePath))) {
    fs.mkdirSync(path.dirname(permanentFilePath), { recursive: true });
  }
  fs.renameSync(filePath, permanentFilePath); // Move the uploaded file

  const newDataSource = dataSourceRepository.create({
    userId,
    name,
    description,
    type: 'csv',
    configuration: {
      filePath: permanentFilePath, // Store the path to the CSV file
      originalFileName: originalFileName,
    },
  });

  try {
    const savedDataSource = await dataSourceRepository.save(newDataSource);
    // Invalidate cache for all data sources for this user
    await cacheService.del(`user:${userId}:dataSources`);
    return savedDataSource;
  } catch (error: any) {
    logger.error(`Failed to create CSV data source: ${error.message}`, { userId, name, filePath, error });
    // Clean up the moved file if DB save fails
    fs.unlink(permanentFilePath, (err) => {
      if (err) logger.error(`Error deleting permanent file ${permanentFilePath} after DB error:`, err);
    });
    throw new AppError('Failed to create CSV data source', 500);
  }
};


export const getAllDataSources = async (userId: string): Promise<DataSource[]> => {
  const cacheKey = `user:${userId}:dataSources`;
  const cachedData = await cacheService.get<DataSource[]>(cacheKey);
  if (cachedData) {
    logger.info(`Serving data sources for user ${userId} from cache.`);
    return cachedData;
  }

  try {
    const dataSources = await dataSourceRepository.find({ where: { userId } });
    await cacheService.set(cacheKey, dataSources, 60 * 5); // Cache for 5 minutes
    return dataSources;
  } catch (error: any) {
    logger.error(`Failed to get all data sources: ${error.message}`, { userId, error });
    throw new AppError('Failed to retrieve data sources', 500);
  }
};

export const getDataSourceById = async (userId: string, id: string): Promise<DataSource> => {
  const dataSource = await dataSourceRepository.findOne({ where: { id, userId } });
  if (!dataSource) {
    throw new AppError('Data source not found or you do not have access', 404);
  }
  return dataSource;
};

export const updateDataSource = async (userId: string, id: string, data: Partial<DataSource>): Promise<DataSource> => {
  const dataSource = await getDataSourceById(userId, id); // Includes ownership check
  dataSourceRepository.merge(dataSource, data);
  try {
    const updatedDataSource = await dataSourceRepository.save(dataSource);
    await cacheService.del(`user:${userId}:dataSources`); // Invalidate list cache
    await cacheService.del(`dataSource:${id}:data`); // Invalidate data cache
    return updatedDataSource;
  } catch (error: any) {
    logger.error(`Failed to update data source: ${error.message}`, { userId, id, data, error });
    throw new AppError('Failed to update data source', 500);
  }
};

export const deleteDataSource = async (userId: string, id: string): Promise<void> => {
  const dataSource = await getDataSourceById(userId, id); // Includes ownership check
  try {
    await dataSourceRepository.remove(dataSource);
    await cacheService.del(`user:${userId}:dataSources`); // Invalidate list cache
    await cacheService.del(`dataSource:${id}:data`); // Invalidate data cache
    // If CSV file, delete the actual file from storage
    if (dataSource.type === 'csv' && dataSource.configuration?.filePath) {
      fs.unlink(dataSource.configuration.filePath, (err) => {
        if (err) logger.error(`Error deleting CSV file ${dataSource.configuration?.filePath}:`, err);
        else logger.info(`Deleted CSV file: ${dataSource.configuration?.filePath}`);
      });
    }
  } catch (error: any) {
    logger.error(`Failed to delete data source: ${error.message}`, { userId, id, error });
    throw new AppError('Failed to delete data source', 500);
  }
};

export const getProcessedDataSourceData = async (userId: string, id: string): Promise<any[]> => {
  const dataSource = await getDataSourceById(userId, id); // Includes ownership check
  const cacheKey = `dataSource:${id}:data`;
  const cachedData = await cacheService.get<any[]>(cacheKey);

  if (cachedData) {
    logger.info(`Serving data for data source ${id} from cache.`);
    return cachedData;
  }

  let rawData: any[] = [];

  switch (dataSource.type) {
    case 'csv':
      if (dataSource.configuration?.filePath) {
        rawData = await parseCsvFile(dataSource.configuration.filePath);
      } else {
        throw new AppError('CSV file path not found in configuration.', 500);
      }
      break;
    case 'database':
      // Implement logic to connect to external DB and fetch data
      // For now, return mock data
      rawData = [
        { category: 'A', value: 10, count: 5 },
        { category: 'B', value: 20, count: 8 },
        { category: 'C', value: 15, count: 3 },
      ];
      break;
    default:
      throw new AppError(`Unsupported data source type: ${dataSource.type}`, 400);
  }

  // Basic data processing/transformation (e.g., ensure numbers are numbers)
  const processedData = rawData.map(row => {
    const newRow: Record<string, any> = {};
    for (const key in row) {
      const value = row[key];
      // Try to convert to number if possible
      newRow[key] = isNaN(Number(value)) ? value : Number(value);
    }
    return newRow;
  });

  await cacheService.set(cacheKey, processedData, 60 * 10); // Cache for 10 minutes
  return processedData;
};

// Helper function to parse CSV
const parseCsvFile = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(new AppError(`Error parsing CSV file: ${error.message}`, 500)));
  });
};
```