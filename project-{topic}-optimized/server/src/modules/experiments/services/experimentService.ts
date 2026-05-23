import { AppDataSource } from '../../../database/data-source';
import { ExperimentRun } from '../entities/ExperimentRun';
import { CreateExperimentDto, UpdateExperimentDto } from '../../../types';
import { NotFoundError } from '../../../utils/errors';
import logger from '../../../utils/logger';
import { User } from '../../auth/entities/User';

const experimentRepository = AppDataSource.getRepository(ExperimentRun);

interface ExperimentCreationData extends CreateExperimentDto {
  createdBy?: User;
}

export const findAllExperiments = async (): Promise<ExperimentRun[]> => {
  logger.debug('Fetching all experiment runs');
  return await experimentRepository.find({ relations: ['model', 'dataset', 'createdBy'] });
};

export const findExperimentById = async (id: string): Promise<ExperimentRun> => {
  logger.debug(`Fetching experiment run by ID: ${id}`);
  const experiment = await experimentRepository.findOne({
    where: { id },
    relations: ['model', 'dataset', 'createdBy'],
  });
  if (!experiment) {
    logger.warn(`Experiment run with ID ${id} not found`);
    throw new NotFoundError(`Experiment run with ID ${id} not found.`);
  }
  return experiment;
};

export const createExperiment = async (data: ExperimentCreationData): Promise<ExperimentRun> => {
  logger.info(`Creating new experiment run: ${data.name}`);
  const newExperiment = experimentRepository.create({
    name: data.name,
    description: data.description,
    modelId: data.modelId,
    datasetId: data.datasetId,
    parametersJson: data.parametersJson,
    metricsJson: data.metricsJson,
    artifactsUrl: data.artifactsUrl,
    createdBy: data.createdBy,
    createdById: data.createdBy?.id,
  });
  await experimentRepository.save(newExperiment);
  return newExperiment;
};

export const updateExperiment = async (id: string, updateData: UpdateExperimentDto): Promise<ExperimentRun> => {
  logger.info(`Updating experiment run with ID: ${id}`);
  const experiment = await findExperimentById(id);

  Object.assign(experiment, updateData);
  await experimentRepository.save(experiment);
  return experiment;
};

export const deleteExperiment = async (id: string): Promise<void> => {
  logger.info(`Deleting experiment run with ID: ${id}`);
  const result = await experimentRepository.delete(id);
  if (result.affected === 0) {
    logger.warn(`Experiment run with ID ${id} not found for deletion`);
    throw new NotFoundError(`Experiment run with ID ${id} not found.`);
  }
};
```