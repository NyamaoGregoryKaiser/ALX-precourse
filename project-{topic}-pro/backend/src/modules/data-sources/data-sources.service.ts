```typescript
import { AppDataSource } from '../../database/data-source';
import { DataSource as DataSrcEntity, DataSourceType } from '../../database/entities/DataSource';
import { Repository } from 'typeorm';
import logger from '../../utils/logger';

interface CreateDataSourceDto {
    name: string;
    type: DataSourceType;
    connectionDetails: Record<string, any>;
    userId: string;
}

interface UpdateDataSourceDto {
    name?: string;
    type?: DataSourceType;
    connectionDetails?: Record<string, any>;
}

export class DataSourceService {
    private dataSourceRepository: Repository<DataSrcEntity>;

    constructor() {
        this.dataSourceRepository = AppDataSource.getRepository(DataSrcEntity);
    }

    async createDataSource(data: CreateDataSourceDto): Promise<DataSrcEntity> {
        try {
            const newDataSource = this.dataSourceRepository.create(data);
            await this.dataSourceRepository.save(newDataSource);
            logger.info(`Data source created: ${newDataSource.name} for user ${data.userId}`);
            return newDataSource;
        } catch (error) {
            logger.error('Error creating data source:', error);
            throw new Error('Failed to create data source');
        }
    }

    async getDataSourcesByUserId(userId: string): Promise<DataSrcEntity[]> {
        try {
            return await this.dataSourceRepository.find({ where: { userId } });
        } catch (error) {
            logger.error(`Error getting data sources for user ${userId}:`, error);
            throw new Error('Failed to retrieve data sources');
        }
    }

    async getDataSourceById(id: string, userId: string): Promise<DataSrcEntity | null> {
        try {
            return await this.dataSourceRepository.findOne({ where: { id, userId } });
        } catch (error) {
            logger.error(`Error getting data source ${id} for user ${userId}:`, error);
            throw new Error('Failed to retrieve data source');
        }
    }

    async updateDataSource(id: string, userId: string, data: UpdateDataSourceDto): Promise<DataSrcEntity | null> {
        try {
            const dataSource = await this.dataSourceRepository.findOne({ where: { id, userId } });
            if (!dataSource) {
                return null;
            }

            Object.assign(dataSource, data);
            await this.dataSourceRepository.save(dataSource);
            logger.info(`Data source updated: ${dataSource.name} by user ${userId}`);
            return dataSource;
        } catch (error) {
            logger.error(`Error updating data source ${id} for user ${userId}:`, error);
            throw new Error('Failed to update data source');
        }
    }

    async deleteDataSource(id: string, userId: string): Promise<boolean> {
        try {
            const result = await this.dataSourceRepository.delete({ id, userId });
            if (result.affected && result.affected > 0) {
                logger.info(`Data source deleted: ${id} by user ${userId}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Error deleting data source ${id} for user ${userId}:`, error);
            // Check for foreign key constraint violation
            if (error instanceof Error && (error as any).code === '23503') { // PostgreSQL foreign key violation code
                throw new Error('Cannot delete data source: It is used by one or more charts.');
            }
            throw new Error('Failed to delete data source');
        }
    }
}
```