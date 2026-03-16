import { AppDataSource } from '../db/data-source';
import { DataSource, DataSourceType } from '../db/entities/DataSource';
import { User } from '../db/entities/User';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { parseCsvFile } from '../utils/csvParser';
import path from 'path';

class DataSourceService {
  private dataSourceRepository = AppDataSource.getRepository(DataSource);
  private userRepository = AppDataSource.getRepository(User);

  async createDataSource(name: string, type: DataSourceType, config: any, ownerId: string) {
    const owner = await this.userRepository.findOneBy({ id: ownerId });
    if (!owner) {
      throw new CustomError('Owner user not found', 404);
    }

    if (type === DataSourceType.CSV_MOCK) {
        if (!config || !config.filePath) {
            throw new CustomError('CSV_MOCK data source requires a filePath in config', 400);
        }
        // Ensure the path is relative to the backend project root or a known safe directory
        // For production, you'd likely store files in a separate S3 bucket or managed storage
        config.filePath = path.resolve(process.cwd(), config.filePath);
        if (!config.filePath.startsWith(path.resolve(process.cwd(), './src/db/mock_data'))) {
            logger.warn(`Attempted to create CSV_MOCK data source with path outside designated mock_data folder: ${config.filePath}`);
            throw new CustomError('Invalid CSV file path. Must be within mock_data directory.', 400);
        }
    }

    const newDataSource = this.dataSourceRepository.create({ name, type, config, owner });
    await this.dataSourceRepository.save(newDataSource);
    logger.info(`Data Source ${newDataSource.id} created by user ${ownerId}`);
    return newDataSource;
  }

  async getAllDataSources(ownerId: string) {
    return this.dataSourceRepository.find({ where: { ownerId }, relations: ['owner'] });
  }

  async getDataSourceById(id: string, ownerId: string) {
    const dataSource = await this.dataSourceRepository.findOne({ where: { id, ownerId }, relations: ['owner'] });
    if (!dataSource) {
      throw new CustomError('Data Source not found or not owned by user', 404);
    }
    return dataSource;
  }

  async updateDataSource(id: string, ownerId: string, updateData: Partial<DataSource>) {
    const dataSource = await this.getDataSourceById(id, ownerId); // Reuses ownership check
    if (!dataSource) {
      throw new CustomError('Data Source not found or not owned by user', 404);
    }

    // Prevent changing owner or ID
    if (updateData.id) delete updateData.id;
    if (updateData.ownerId) delete updateData.ownerId;
    if (updateData.owner) delete updateData.owner;

    Object.assign(dataSource, updateData);
    await this.dataSourceRepository.save(dataSource);
    logger.info(`Data Source ${id} updated by user ${ownerId}`);
    return dataSource;
  }

  async deleteDataSource(id: string, ownerId: string) {
    const dataSource = await this.getDataSourceById(id, ownerId); // Reuses ownership check
    if (!dataSource) {
      throw new CustomError('Data Source not found or not owned by user', 404);
    }
    const result = await this.dataSourceRepository.delete(id);
    if (result.affected === 0) {
      throw new CustomError('Failed to delete data source', 500);
    }
    logger.info(`Data Source ${id} deleted by user ${ownerId}`);
    return { message: 'Data Source deleted successfully' };
  }

  async fetchDataFromSource(dataSourceId: string, ownerId: string, query?: any) {
    const dataSource = await this.getDataSourceById(dataSourceId, ownerId);

    switch (dataSource.type) {
      case DataSourceType.CSV_MOCK:
        if (!dataSource.config || !dataSource.config.filePath) {
            throw new CustomError('CSV_MOCK data source configuration is incomplete', 500);
        }
        const rawData = await parseCsvFile(dataSource.config.filePath);
        return this.processCsvData(rawData, query);
      // case DataSourceType.POSTGRES:
      //   // Implement database query logic here
      //   return this.queryPostgres(dataSource.config, query);
      // case DataSourceType.API:
      //   // Implement API fetch logic here
      //   return this.fetchFromApi(dataSource.config, query);
      default:
        throw new CustomError(`Unsupported data source type: ${dataSource.type}`, 400);
    }
  }

  // Basic CSV data processing/aggregation. This could be much more complex.
  private processCsvData(data: any[], query: any): any[] {
    if (!query || !query.aggregate || !query.valueColumn || !query.groupByColumn) {
      // If no complex query, return raw data or first N rows
      return data.slice(0, 100); // Limit to 100 rows for raw preview
    }

    const { aggregate, valueColumn, groupByColumn, orderBy } = query;
    const aggregatedData: { [key: string]: any } = {};

    for (const row of data) {
      const groupKey = row[groupByColumn];
      const value = parseFloat(row[valueColumn]);

      if (isNaN(value)) {
        logger.warn(`Skipping row with non-numeric value for aggregation in column ${valueColumn}: ${row[valueColumn]}`);
        continue;
      }

      if (!aggregatedData[groupKey]) {
        aggregatedData[groupKey] = { [groupByColumn]: groupKey, [valueColumn]: 0, count: 0 };
      }

      if (aggregate === 'sum') {
        aggregatedData[groupKey][valueColumn] += value;
      } else if (aggregate === 'avg') {
        aggregatedData[groupKey][valueColumn] += value;
        aggregatedData[groupKey].count++;
      } else if (aggregate === 'count') {
          // Count distinct instances or just occurrences of the group
          aggregatedData[groupKey][valueColumn]++;
      }
      // Add other aggregations as needed (min, max, etc.)
    }

    let result = Object.values(aggregatedData);

    // Apply average if needed
    if (aggregate === 'avg') {
      result = result.map(item => ({
        ...item,
        [valueColumn]: item.count > 0 ? item[valueColumn] / item.count : 0,
        count: undefined // Remove count from final output
      }));
    }

    // Apply order by
    if (orderBy) {
      result.sort((a, b) => {
        if (typeof a[orderBy] === 'string') {
          return a[orderBy].localeCompare(b[orderBy]);
        }
        return a[orderBy] - b[orderBy];
      });
    }

    return result;
  }
}

export const dataSourceService = new DataSourceService();