import { AppDataSource } from '../../../database/data-source';
import { MLModel } from '../entities/MLModel';
import { CreateModelDto, UpdateModelDto } from '../../../types';
import { NotFoundError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import { User } from '../../auth/entities/User';

const modelRepository = AppDataSource.getRepository(MLModel);

interface ModelCreationData extends CreateModelDto {
  createdBy?: User;
}

export const findAllModels = async (): Promise<MLModel[]> => {
  logger.debug('Fetching all models');
  return await modelRepository.find({ relations: ['dataset', 'createdBy'] });
};

export const findModelById = async (id: string): Promise<MLModel> => {
  logger.debug(`Fetching model by ID: ${id}`);
  const model = await modelRepository.findOne({
    where: { id },
    relations: ['dataset', 'createdBy'],
  });
  if (!model) {
    logger.warn(`Model with ID ${id} not found`);
    throw new NotFoundError(`Model with ID ${id} not found.`);
  }
  return model;
};

export const createModel = async (data: ModelCreationData): Promise<MLModel> => {
  logger.info(`Creating new model: ${data.name}`);
  const newModel = modelRepository.create({
    name: data.name,
    version: data.version,
    framework: data.framework,
    type: data.type,
    description: data.description,
    datasetId: data.datasetId,
    metricsJson: data.metricsJson,
    hyperparametersJson: data.hyperparametersJson,
    createdBy: data.createdBy,
    createdById: data.createdBy?.id,
  });
  await modelRepository.save(newModel);
  return newModel;
};

export const updateModel = async (id: string, updateData: UpdateModelDto): Promise<MLModel> => {
  logger.info(`Updating model with ID: ${id}`);
  const model = await findModelById(id);

  Object.assign(model, updateData);
  await modelRepository.save(model);
  return model;
};

export const deleteModel = async (id: string): Promise<void> => {
  logger.info(`Deleting model with ID: ${id}`);
  const result = await modelRepository.delete(id);
  if (result.affected === 0) {
    logger.warn(`Model with ID ${id} not found for deletion`);
    throw new NotFoundError(`Model with ID ${id} not found.`);
  }
};
```