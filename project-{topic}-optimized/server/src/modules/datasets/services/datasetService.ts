import { AppDataSource } from '../../../database/data-source';
import { Dataset } from '../entities/Dataset';
import { CreateDatasetDto, UpdateDatasetDto } from '../../../types';
import { NotFoundError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import { User } from '../../auth/entities/User';
import { getCache, setCache, deleteCache } from '../../../utils/cache';

const datasetRepository = AppDataSource.getRepository(Dataset);
const CACHE_PREFIX = 'dataset_';

interface DatasetCreationData extends CreateDatasetDto {
  fileUrl: string;
  schemaJson: object;
  createdBy?: User;
}

export const findAllDatasets = async (): Promise<Dataset[]> => {
  logger.debug('Fetching all datasets');
  const cachedDatasets = getCache<Dataset[]>(CACHE_PREFIX + 'all');
  if (cachedDatasets) {
    return cachedDatasets;
  }

  const datasets = await datasetRepository.find({ relations: ['createdBy'] });
  setCache(CACHE_PREFIX + 'all', datasets);
  return datasets;
};

export const findDatasetById = async (id: string): Promise<Dataset> => {
  logger.debug(`Fetching dataset by ID: ${id}`);
  const cachedDataset = getCache<Dataset>(CACHE_PREFIX + id);
  if (cachedDataset) {
    return cachedDataset;
  }

  const dataset = await datasetRepository.findOne({
    where: { id },
    relations: ['createdBy'],
  });
  if (!dataset) {
    logger.warn(`Dataset with ID ${id} not found`);
    throw new NotFoundError(`Dataset with ID ${id} not found.`);
  }
  setCache(CACHE_PREFIX + id, dataset);
  return dataset;
};

export const createDataset = async (data: DatasetCreationData): Promise<Dataset> => {
  logger.info(`Creating new dataset: ${data.name}`);
  const newDataset = datasetRepository.create({
    name: data.name,
    description: data.description,
    fileUrl: data.fileUrl,
    schemaJson: data.schemaJson,
    createdBy: data.createdBy,
    createdById: data.createdBy?.id,
  });
  await datasetRepository.save(newDataset);
  deleteCache(CACHE_PREFIX + 'all'); // Invalidate all datasets cache
  setCache(CACHE_PREFIX + newDataset.id, newDataset); // Cache new dataset
  return newDataset;
};

export const updateDataset = async (id: string, updateData: UpdateDatasetDto): Promise<Dataset> => {
  logger.info(`Updating dataset with ID: ${id}`);
  const dataset = await findDatasetById(id); // Re-use findById for existence check and error handling

  Object.assign(dataset, updateData);
  await datasetRepository.save(dataset);
  deleteCache(CACHE_PREFIX + 'all'); // Invalidate all datasets cache
  setCache(CACHE_PREFIX + id, dataset); // Update cache for this dataset
  return dataset;
};

export const deleteDataset = async (id: string): Promise<void> => {
  logger.info(`Deleting dataset with ID: ${id}`);
  const result = await datasetRepository.delete(id);
  if (result.affected === 0) {
    logger.warn(`Dataset with ID ${id} not found for deletion`);
    throw new NotFoundError(`Dataset with ID ${id} not found.`);
  }
  deleteCache(CACHE_PREFIX + 'all'); // Invalidate all datasets cache
  deleteCache(CACHE_PREFIX + id); // Invalidate specific dataset cache
};
```