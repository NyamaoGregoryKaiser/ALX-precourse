```typescript
import { AppDataSourceInstance } from '../database';
import { Dataset } from '../database/entities/Dataset';
import { DataSource } from '../database/entities/DataSource';
import { IQueryOptions } from '../interfaces/data.interface';
import { CustomError } from '../interfaces/error.interface';
import { getDataService } from '../utils/dataProcessing.utils';
import logger from '../config/logger';

export class DatasetService {
  private datasetRepository = AppDataSourceInstance.getRepository(Dataset);
  private dataSourceRepository = AppDataSourceInstance.getRepository(DataSource);

  async createDataset(
    name: string,
    query: string,
    dataSourceId: string,
    userId: string,
    description?: string
  ): Promise<Dataset> {
    const dataSource = await this.dataSourceRepository.findOne({ where: { id: dataSourceId, userId } });
    if (!dataSource) {
      throw new CustomError(404, 'Data source not found or you do not have permission to access it.');
    }

    // Infer schema from the data source query
    const dataService = getDataService(dataSource.type);
    const inferredSchema = await dataService.getSchema(dataSource.connectionConfig, query);
    if (Object.keys(inferredSchema).length === 0) {
      logger.warn(`Could not infer schema for dataset '${name}' from data source '${dataSource.name}'.`);
    }

    const newDataset = this.datasetRepository.create({
      name,
      query,
      dataSource,
      dataSourceId,
      description,
      schema: inferredSchema,
    });
    await this.datasetRepository.save(newDataset);
    logger.info(`Dataset '${name}' created for data source ${dataSourceId} by user ${userId}.`);
    return newDataset;
  }

  async getAllDatasets(userId: string): Promise<Dataset[]> {
    // Need to ensure datasets belong to data sources owned by the user
    const dataSources = await this.dataSourceRepository.find({ where: { userId }, relations: ['datasets'] });
    return dataSources.flatMap(ds => ds.datasets);
  }

  async getDatasetById(id: string, userId: string): Promise<Dataset> {
    const dataset = await this.datasetRepository.findOne({
      where: { id },
      relations: ['dataSource'],
    });

    if (!dataset || dataset.dataSource.userId !== userId) {
      throw new CustomError(404, 'Dataset not found or you do not have permission to access it.');
    }
    return dataset;
  }

  async updateDataset(
    id: string,
    userId: string,
    updates: Partial<{ name: string; query: string; dataSourceId: string; description: string; schema: Record<string, any> }>
  ): Promise<Dataset> {
    const dataset = await this.getDatasetById(id, userId); // Ensures user owns dataset

    // If query or dataSourceId is updated, re-infer schema
    if (updates.query || updates.dataSourceId) {
      const newDataSourceId = updates.dataSourceId || dataset.dataSourceId;
      const newQuery = updates.query || dataset.query;

      const newDataSource = await this.dataSourceRepository.findOne({ where: { id: newDataSourceId, userId } });
      if (!newDataSource) {
        throw new CustomError(404, 'New data source not found or you do not have permission to access it.');
      }

      const dataService = getDataService(newDataSource.type);
      const inferredSchema = await dataService.getSchema(newDataSource.connectionConfig, newQuery);
      if (Object.keys(inferredSchema).length === 0) {
        logger.warn(`Could not infer schema for updated dataset '${dataset.name}' from data source '${newDataSource.name}'.`);
      }
      Object.assign(updates, { schema: inferredSchema, dataSource: newDataSource, dataSourceId: newDataSource.id });
    }

    Object.assign(dataset, updates);
    await this.datasetRepository.save(dataset);
    logger.info(`Dataset '${dataset.name}' updated by user ${userId}.`);
    return dataset;
  }

  async deleteDataset(id: string, userId: string): Promise<void> {
    const dataset = await this.getDatasetById(id, userId); // Ensures user owns dataset
    const result = await this.datasetRepository.delete({ id });
    if (result.affected === 0) {
      throw new CustomError(404, 'Dataset not found.'); // Should not happen if getDatasetById passes
    }
    logger.info(`Dataset ${id} deleted by user ${userId}.`);
  }

  async getDatasetData(id: string, userId: string, options?: IQueryOptions): Promise<any[]> {
    const dataset = await this.getDatasetById(id, userId); // Ensures user owns dataset
    const dataSource = await this.dataSourceRepository.findOneBy({ id: dataset.dataSourceId });
    if (!dataSource) {
      throw new CustomError(404, 'Associated data source not found.');
    }

    const dataService = getDataService(dataSource.type);
    return dataService.query(dataSource.connectionConfig, dataset.query, options);
  }
}
```