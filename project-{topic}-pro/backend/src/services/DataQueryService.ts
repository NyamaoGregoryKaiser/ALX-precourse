```typescript
import { AppDataSource } from '../database/data-source';
import { DataSource as DataSrcEntity, DataSourceType } from '../database/entities/DataSource';
import logger from '../utils/logger';
import { Client as PGClient } from 'pg'; // For PostgreSQL direct queries

// This is a simplified service. In a real-world scenario, you'd have
// separate drivers/clients for each data source type (e.g., MySQL, MongoDB).
// You'd also need robust SQL injection prevention beyond basic parameterization
// when dynamic queries are involved, or use a query builder library.

export class DataQueryService {
    private dataSourceRepository = AppDataSource.getRepository(DataSrcEntity);

    /**
     * Executes a query against a specified data source.
     * @param dataSourceId The ID of the data source to query.
     * @param query The SQL query string.
     * @param userId The ID of the user performing the query (for authorization/logging).
     * @returns The query results.
     */
    async executeQuery(dataSourceId: string, query: string, userId: string): Promise<any[]> {
        const dataSource = await this.dataSourceRepository.findOne({
            where: { id: dataSourceId, userId: userId }
        });

        if (!dataSource) {
            logger.warn(`Attempted query on non-existent or unauthorized data source: ${dataSourceId} by user: ${userId}`);
            throw new Error('Data source not found or not authorized for this user.');
        }

        // Basic query sanitization (NOT a full SQL injection prevention)
        // For production, consider a full-fledged query parser or a strict whitelist of operations.
        const lowerCaseQuery = query.toLowerCase();
        if (!lowerCaseQuery.startsWith('select')) {
            throw new Error('Only SELECT queries are allowed for data retrieval.');
        }
        if (lowerCaseQuery.includes('delete') || lowerCaseQuery.includes('update') || lowerCaseQuery.includes('insert') || lowerCaseQuery.includes('drop')) {
             throw new Error('DML/DDL operations are not allowed.');
        }

        switch (dataSource.type) {
            case DataSourceType.POSTGRES:
                return this.executePostgresQuery(dataSource.connectionDetails, query);
            // case DataSourceType.MYSQL:
            //     return this.executeMySqlQuery(dataSource.connectionDetails, query);
            // case DataSourceType.MONGODB:
            //     return this.executeMongoQuery(dataSource.connectionDetails, query);
            // case DataSourceType.CSV_UPLOAD:
            //     return this.executeCsvQuery(dataSource.connectionDetails, query);
            default:
                throw new Error(`Unsupported data source type: ${dataSource.type}`);
        }
    }

    private async executePostgresQuery(connectionDetails: Record<string, any>, query: string): Promise<any[]> {
        const { host, port, username, password, database } = connectionDetails;

        if (!host || !port || !username || !password || !database) {
            throw new Error('Incomplete PostgreSQL connection details.');
        }

        const client = new PGClient({
            host,
            port,
            user: username,
            password,
            database,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Adjust for production SSL
        });

        try {
            await client.connect();
            logger.info(`Connected to PostgreSQL database: ${database} on ${host}:${port}`);
            const result = await client.query(query);
            return result.rows;
        } catch (error: any) {
            logger.error(`Error executing PostgreSQL query: ${error.message}`, { query, connectionDetails });
            throw new Error(`Failed to query PostgreSQL data source: ${error.message}`);
        } finally {
            await client.end();
            logger.info(`Disconnected from PostgreSQL database.`);
        }
    }

    // --- Placeholder methods for other data source types ---
    // private async executeMySqlQuery(connectionDetails: Record<string, any>, query: string): Promise<any[]> {
    //     logger.info('Executing MySQL query (mocked)...');
    //     // Implement MySQL client connection and query execution
    //     return [{ mock: 'mysql_data', query }];
    // }

    // private async executeMongoQuery(connectionDetails: Record<string, any>, query: string): Promise<any[]> {
    //     logger.info('Executing MongoDB query (mocked)...');
    //     // Implement MongoDB client connection and query execution
    //     // Note: Query will not be SQL, but a JSON-based query for MongoDB
    //     return [{ mock: 'mongodb_data', query }];
    // }

    // private async executeCsvQuery(connectionDetails: Record<string, any>, query: string): Promise<any[]> {
    //     logger.info('Executing CSV query (mocked)...');
    //     // Implement CSV file reading and in-memory querying
    //     return [{ mock: 'csv_data', query }];
    // }
}
```