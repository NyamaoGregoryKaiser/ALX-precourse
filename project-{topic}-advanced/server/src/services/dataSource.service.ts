import { AppDataSource } from '../database/data-source';
import { DataSource } from '../database/entities/DataSource.entity';
import { AppError } from '../utils/appError';
import { decrypt, encrypt } from '../utils/encryption.util';
import { DataSourceType } from '../types/dataSource.types';
import { Client as PgClient } from 'pg'; // For PostgreSQL
import csv from 'csv-parser';
import { Readable } from 'stream';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { logger } from '../middleware/logger.middleware';
import Redis from 'ioredis';

// Initialize Redis client for caching
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const CACHE_TTL = 60 * 5; // 5 minutes

export class DataSourceService {
  private dataSourceRepository = AppDataSource.getRepository(DataSource);

  async createDataSource(
    name: string,
    type: DataSourceType,
    connectionDetails: object,
    userId: string
  ): Promise<DataSource> {
    const encryptedDetails = encrypt(JSON.stringify(connectionDetails));
    const dataSource = this.dataSourceRepository.create({
      name,
      type,
      connectionDetails: encryptedDetails,
      user: { id: userId },
    });
    await this.dataSourceRepository.save(dataSource);
    return dataSource;
  }

  async getDataSourceById(id: string, userId: string): Promise<DataSource | null> {
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (dataSource) {
      dataSource.connectionDetails = JSON.parse(decrypt(dataSource.connectionDetails));
    }
    return dataSource;
  }

  async getAllDataSources(userId: string): Promise<DataSource[]> {
    const dataSources = await this.dataSourceRepository.find({
      where: { user: { id: userId } },
    });
    return dataSources.map((ds) => {
      // Decrypt details for sending to client (for display/editing, handle carefully)
      // For security, consider only sending necessary non-sensitive info
      const decryptedDetails = JSON.parse(decrypt(ds.connectionDetails));
      return { ...ds, connectionDetails: decryptedDetails };
    });
  }

  async updateDataSource(
    id: string,
    userId: string,
    updateData: { name?: string; connectionDetails?: object }
  ): Promise<DataSource> {
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!dataSource) {
      throw new AppError('Data Source not found or unauthorized', 404);
    }

    if (updateData.name) {
      dataSource.name = updateData.name;
    }
    if (updateData.connectionDetails) {
      dataSource.connectionDetails = encrypt(JSON.stringify(updateData.connectionDetails));
    }

    await this.dataSourceRepository.save(dataSource);
    // Decrypt before returning
    dataSource.connectionDetails = JSON.parse(decrypt(dataSource.connectionDetails));
    return dataSource;
  }

  async deleteDataSource(id: string, userId: string): Promise<void> {
    const result = await this.dataSourceRepository.delete({ id, user: { id: userId } });
    if (result.affected === 0) {
      throw new AppError('Data Source not found or unauthorized', 404);
    }
  }

  async testDataSourceConnection(dataSourceId: string, userId: string): Promise<boolean> {
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id: dataSourceId, user: { id: userId } },
    });
    if (!dataSource) {
      throw new AppError('Data Source not found or unauthorized', 404);
    }

    const decryptedDetails = JSON.parse(decrypt(dataSource.connectionDetails));

    switch (dataSource.type) {
      case DataSourceType.POSTGRESQL:
        return this.testPostgresConnection(decryptedDetails);
      // case DataSourceType.MYSQL: return this.testMySqlConnection(decryptedDetails);
      // case DataSourceType.CSV_UPLOAD: // No "connection" to test for CSV, assume valid.
      default:
        return true;
    }
  }

  private async testPostgresConnection(details: any): Promise<boolean> {
    const client = new PgClient({
      host: details.host,
      port: details.port,
      user: details.user,
      password: details.password,
      database: details.database,
      ssl: details.sslMode === 'require' ? { rejectUnauthorized: false } : false,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch (error) {
      logger.error('PostgreSQL connection test failed:', error);
      return false;
    }
  }

  async executeQuery(dataSourceId: string, userId: string, query: string): Promise<any[]> {
    const cacheKey = `query_result:${dataSourceId}:${userId}:${query}`;
    const cachedResult = await redisClient.get(cacheKey);

    if (cachedResult) {
      logger.info(`Cache hit for query: ${cacheKey}`);
      return JSON.parse(cachedResult);
    }

    const dataSource = await this.dataSourceRepository.findOne({
      where: { id: dataSourceId, user: { id: userId } },
    });
    if (!dataSource) {
      throw new AppError('Data Source not found or unauthorized', 404);
    }

    const decryptedDetails = JSON.parse(decrypt(dataSource.connectionDetails));

    // Basic SQL injection prevention: only SELECT statements allowed,
    // and prevent DDL/DML. A more robust solution involves a full SQL parser
    // or prepared statements with parameter binding.
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      throw new AppError('Only SELECT queries are allowed.', 403);
    }
    if (query.match(/^(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/i)) {
        throw new AppError('DDL/DML operations are not permitted.', 403);
    }

    let result: any[] = [];

    switch (dataSource.type) {
      case DataSourceType.POSTGRESQL:
        result = await this.executePostgresQuery(decryptedDetails, query);
        break;
      // case DataSourceType.MYSQL:
      //   result = await this.executeMySqlQuery(decryptedDetails, query);
      //   break;
      case DataSourceType.CSV_UPLOAD:
        // For CSV, the 'query' here might be a filter or aggregation instruction
        // In a real system, CSV data would be stored and queried via an embedded database (e.g., DuckDB)
        // or a dedicated file processing service. For this example, we'll simulate.
        throw new AppError('CSV data cannot be directly queried via raw SQL. Implement file-based query logic.', 501);
      default:
        throw new AppError('Unsupported data source type', 400);
    }

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
  }

  private async executePostgresQuery(details: any, query: string): Promise<any[]> {
    const client = new PgClient({
      host: details.host,
      port: details.port,
      user: details.user,
      password: details.password,
      database: details.database,
      ssl: details.sslMode === 'require' ? { rejectUnauthorized: false } : false,
    });
    try {
      await client.connect();
      const res = await client.query(query);
      await client.end();
      return res.rows;
    } catch (error) {
      logger.error('PostgreSQL query execution failed:', error);
      throw new AppError('Error executing query against PostgreSQL: ' + (error as Error).message, 500);
    }
  }

  // --- CSV Handling (Simplified for example) ---
  // In a real system, CSV would be uploaded to storage (S3),
  // metadata stored in DB, and a specialized service would query it.
  async processCsvFile(fileBuffer: Buffer): Promise<any[]> {
    const results: any[] = [];
    const streamPipeline = promisify(pipeline);
    const readableStream = Readable.from(fileBuffer);

    try {
      await streamPipeline(
        readableStream,
        csv(),
        async function* (source) {
          for await (const chunk of source) {
            results.push(chunk);
            yield; // Allows stream to continue
          }
        }
      );
      return results;
    } catch (error) {
      logger.error('CSV processing failed:', error);
      throw new AppError('Error processing CSV file: ' + (error as Error).message, 500);
    }
  }
}