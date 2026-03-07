```typescript
import { AppDataSourceInstance } from '../database';
import { DataSource, DataSourceType } from '../database/entities/DataSource';
import { User } from '../database/entities/User';
import { IDataSourceConnectionConfig } from '../interfaces/data.interface';
import { CustomError } from '../interfaces/error.interface';
import { getDataService } from '../utils/dataProcessing.utils';
import logger from '../config/logger';

export class DataSourceService {
  private dataSourceRepository = AppDataSourceInstance.getRepository(DataSource);

  async createDataSource(
    name: string,
    type: DataSourceType,
    connectionConfig: IDataSourceConnectionConfig,
    userId: string,
    description?: string
  ): Promise<DataSource> {
    const user = await AppDataSourceInstance.getRepository(User).findOneBy({ id: userId });
    if (!user) {
      throw new CustomError(404, 'User not found.');
    }

    // Test connection before saving
    const dataService = getDataService(type);
    const isConnected = await dataService.testConnection(connectionConfig);
    if (!isConnected) {
      throw new CustomError(400, 'Failed to connect to the provided data source with the given configuration.');
    }

    const newDataSource = this.dataSourceRepository.create({
      name,
      type,
      connectionConfig,
      description,
      user,
      userId,
    });
    await this.dataSourceRepository.save(newDataSource);
    logger.info(`Data source '${name}' created by user ${userId}.`);
    return newDataSource;
  }

  async getAllDataSources(userId: string): Promise<DataSource[]> {
    return this.dataSourceRepository.find({ where: { userId } });
  }

  async getDataSourceById(id: string, userId: string): Promise<DataSource> {
    const dataSource = await this.dataSourceRepository.findOne({ where: { id, userId } });
    if (!dataSource) {
      throw new CustomError(404, 'Data source not found or you do not have permission to access it.');
    }
    return dataSource;
  }

  async updateDataSource(
    id: string,
    userId: string,
    updates: Partial<{ name: string; type: DataSourceType; connectionConfig: IDataSourceConnectionConfig; description: string }>
  ): Promise<DataSource> {
    const dataSource = await this.getDataSourceById(id, userId);

    // If connectionConfig is updated, test it
    if (updates.connectionConfig || updates.type) {
      const newType = updates.type || dataSource.type;
      const newConfig = updates.connectionConfig || dataSource.connectionConfig;
      const dataService = getDataService(newType);
      const isConnected = await dataService.testConnection(newConfig);
      if (!isConnected) {
        throw new CustomError(400, 'Failed to connect to the updated data source with the given configuration.');
      }
    }

    Object.assign(dataSource, updates);
    await this.dataSourceRepository.save(dataSource);
    logger.info(`Data source '${dataSource.name}' updated by user ${userId}.`);
    return dataSource;
  }

  async deleteDataSource(id: string, userId: string): Promise<void> {
    const result = await this.dataSourceRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new CustomError(404, 'Data source not found or you do not have permission to delete it.');
    }
    logger.info(`Data source ${id} deleted by user ${userId}.`);
  }

  async testDataSourceConnection(id: string, userId: string): Promise<boolean> {
    const dataSource = await this.getDataSourceById(id, userId);
    const dataService = getDataService(dataSource.type);
    return dataService.testConnection(dataSource.connectionConfig);
  }
}
```