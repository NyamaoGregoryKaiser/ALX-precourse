```typescript
import { IDataService, IDataSourceConnectionConfig, IQueryOptions } from '../interfaces/data.interface';
import { DataSourceType } from '../database/entities/DataSource';
import { CustomError } from '../interfaces/error.interface';
import { Pool } from 'pg'; // PostgreSQL client
import logger from '../config/logger';

// --- PostgreSQL Data Service ---
class PostgresDataService implements IDataService {
  private getPool(config: IDataSourceConnectionConfig): Pool {
    if (!config.host || !config.port || !config.database || !config.username || !config.password) {
      throw new CustomError(400, 'Invalid PostgreSQL connection configuration.');
    }
    return new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: process.env.NODE_ENV === 'production' // Use SSL in production
    });
  }

  async connect(config: IDataSourceConnectionConfig): Promise<any> {
    const pool = this.getPool(config);
    try {
      await pool.connect(); // Just try to connect
      return pool;
    } catch (error) {
      logger.error(`PostgreSQL connection failed: ${error}`);
      throw new CustomError(500, `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async query(config: IDataSourceConnectionConfig, query: string, options?: IQueryOptions): Promise<any[]> {
    const pool = this.getPool(config);
    let client;
    try {
      client = await pool.connect();
      let fullQuery = query;
      const queryParams: any[] = [];

      // Basic pagination and sorting (for SQL)
      if (options?.sortBy) {
        fullQuery += ` ORDER BY ${options.sortBy} ${options.sortOrder || 'ASC'}`;
      }
      if (options?.limit) {
        fullQuery += ` LIMIT $${queryParams.length + 1}`;
        queryParams.push(options.limit);
      }
      if (options?.offset) {
        fullQuery += ` OFFSET $${queryParams.length + 1}`;
        queryParams.push(options.offset);
      }

      const result = await client.query(fullQuery, queryParams);
      return result.rows;
    } catch (error) {
      logger.error(`PostgreSQL query failed: ${error}`);
      throw new CustomError(400, `PostgreSQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client?.release();
    }
  }

  async getSchema(config: IDataSourceConnectionConfig, query: string): Promise<Record<string, any>> {
    const pool = this.getPool(config);
    let client;
    try {
      client = await pool.connect();
      // For schema inference, we can run a query with LIMIT 0 or LIMIT 1
      // For more robust schema, one might parse the SQL for table names and query information_schema
      const result = await client.query(`${query} LIMIT 1`);
      if (result.rows.length === 0 && result.fields.length === 0) {
        // If no rows, try to get schema without data
        // This is a simplistic approach; a real system might parse the SQL to understand the table
        // For now, assume a query that might return data
        return {}; // Cannot infer schema from 0 results without more advanced SQL parsing
      }

      const schema: Record<string, any> = {};
      result.fields.forEach(field => {
        // Map PostgreSQL data types to a more generic type
        let type = 'string'; // Default
        switch (field.dataTypeID) {
          case 20: // bigint
          case 21: // smallint
          case 23: // integer
          case 700: // real
          case 701: // double precision
          case 1700: // numeric
            type = 'number';
            break;
          case 16: // boolean
            type = 'boolean';
            break;
          case 1082: // date
          case 1114: // timestamp without time zone
          case 1184: // timestamp with time zone
            type = 'date';
            break;
          case 114: // json
          case 3802: // jsonb
            type = 'object';
            break;
        }
        schema[field.name] = { type, pgType: field.dataTypeID, name: field.name };
      });
      return schema;
    } catch (error) {
      logger.error(`PostgreSQL schema inference failed: ${error}`);
      throw new CustomError(400, `Failed to infer schema from PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client?.release();
    }
  }

  async testConnection(config: IDataSourceConnectionConfig): Promise<boolean> {
    const pool = this.getPool(config);
    let client;
    try {
      client = await pool.connect();
      await client.query('SELECT 1'); // Simple query to test connection
      return true;
    } catch (error) {
      logger.error(`PostgreSQL test connection failed: ${error}`);
      return false;
    } finally {
      client?.release();
    }
  }
}

// --- CSV/JSON Mock Data Service (for demonstration) ---
// In a real scenario, this would involve parsing files, handling large data, etc.
class CsvJsonMockDataService implements IDataService {
  private mockDataStore: { [key: string]: any[] } = {
    'mock_customer_data.csv': [
      { id: 1, name: 'Alice', age: 30, city: 'New York', country: 'USA', revenue: 1200 },
      { id: 2, name: 'Bob', age: 24, city: 'London', country: 'UK', revenue: 800 },
      { id: 3, name: 'Charlie', age: 35, city: 'Paris', country: 'France', revenue: 1500 },
      { id: 4, name: 'David', age: 29, city: 'New York', country: 'USA', revenue: 900 },
      { id: 5, name: 'Eve', age: 42, city: 'London', country: 'UK', revenue: 2000 },
    ],
    'mock_product_data.json': [
      { productId: 'P001', name: 'Laptop', price: 1200, category: 'Electronics' },
      { productId: 'P002', name: 'Keyboard', price: 75, category: 'Electronics' },
      { productId: 'P003', name: 'Desk', price: 300, category: 'Furniture' },
      { productId: 'P004', name: 'Mouse', price: 25, category: 'Electronics' },
    ]
  };

  async connect(config: IDataSourceConnectionConfig): Promise<any> {
    // For mock, just check if filePath exists in our mock store
    if (!config.filePath || !this.mockDataStore[config.filePath]) {
      throw new CustomError(400, 'Mock file path not found.');
    }
    return true; // Connection successful
  }

  async query(config: IDataSourceConnectionConfig, query: string, options?: IQueryOptions): Promise<any[]> {
    if (!config.filePath || !this.mockDataStore[config.filePath]) {
      throw new CustomError(400, 'Mock file path not found for query.');
    }
    let data = [...this.mockDataStore[config.filePath]];

    // Simple "query" logic based on query string or filters
    // For CSV_UPLOAD, the "query" might be a simple table name, or even a basic filter string.
    // For demonstration, we'll assume the "query" is effectively ignored and we return the whole data,
    // or apply basic filtering if a `query` string like `city=New York` is passed.
    if (query && query.includes('=')) {
        try {
            const [key, value] = query.split('=');
            data = data.filter(row => String(row[key]) === value);
        } catch (e) {
            logger.warn(`Could not parse mock query string: ${query}`);
        }
    }


    // Apply sorting
    if (options?.sortBy) {
      data.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return options.sortOrder === 'DESC' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        }
        return options.sortOrder === 'DESC' ? bVal - aVal : aVal - bVal;
      });
    }

    // Apply pagination
    const start = options?.offset || 0;
    const end = options?.limit ? start + options.limit : data.length;
    data = data.slice(start, end);

    return data;
  }

  async getSchema(config: IDataSourceConnectionConfig, query: string): Promise<Record<string, any>> {
    if (!config.filePath || !this.mockDataStore[config.filePath]) {
      throw new CustomError(400, 'Mock file path not found for schema inference.');
    }
    const data = this.mockDataStore[config.filePath];
    if (data.length === 0) {
      return {};
    }
    const sampleRow = data[0];
    const schema: Record<string, any> = {};
    for (const key in sampleRow) {
      if (Object.prototype.hasOwnProperty.call(sampleRow, key)) {
        let type = typeof sampleRow[key];
        // Refine type for number/date if possible
        if (type === 'string' && !isNaN(Date.parse(sampleRow[key]))) {
          type = 'date';
        } else if (type === 'string' && !isNaN(Number(sampleRow[key]))) {
          type = 'number';
        }
        schema[key] = { type, name: key };
      }
    }
    return schema;
  }

  async testConnection(config: IDataSourceConnectionConfig): Promise<boolean> {
    return !!config.filePath && !!this.mockDataStore[config.filePath];
  }
}

// --- Data Service Registry ---
export const dataServiceRegistry: IDataSourceServiceMap = {
  [DataSourceType.POSTGRES]: new PostgresDataService(),
  [DataSourceType.CSV_UPLOAD]: new CsvJsonMockDataService(),
  [DataSourceType.JSON_UPLOAD]: new CsvJsonMockDataService(), // Can reuse for JSON mock
  // Add other data source types here (MySQL, MongoDB, etc.)
};

export const getDataService = (type: DataSourceType): IDataService => {
  const service = dataServiceRegistry[type];
  if (!service) {
    throw new CustomError(501, `Data source type '${type}' not supported.`);
  }
  return service;
};

// --- Data Transformation Utilities ---
export const transformDataForChart = (
  rawData: any[],
  chartType: ChartType,
  dataMapping: Record<string, any>,
  chartConfig: Record<string, any> // Might include fields like 'xField', 'yField'
): any[] => {
  // This is a simplified example. Real transformation can be complex
  // and depend heavily on the charting library used.

  if (!rawData || rawData.length === 0) return [];

  switch (chartType) {
    case ChartType.BAR:
    case ChartType.LINE:
    case ChartType.AREA: {
      const xField = chartConfig.xField;
      const yField = chartConfig.yField;
      const seriesField = chartConfig.seriesField;

      if (!xField || !yField) {
        throw new CustomError(400, 'xField and yField are required for bar/line/area charts.');
      }

      return rawData.map(row => ({
        [xField]: row[xField],
        [yField]: row[yField],
        ...(seriesField && { [seriesField]: row[seriesField] }),
        ...row // Include other fields for tooltip/interaction
      }));
    }
    case ChartType.PIE: {
      const angleField = chartConfig.angleField;
      const colorField = chartConfig.colorField;

      if (!angleField || !colorField) {
        throw new CustomError(400, 'angleField and colorField are required for pie charts.');
      }

      // Aggregate data if necessary, or assume rawData is already aggregated
      // For simplicity, assuming rawData is already suitable (e.g., each row is a slice)
      return rawData.map(row => ({
        [angleField]: row[angleField],
        [colorField]: row[colorField],
        ...row
      }));
    }
    case ChartType.TABLE:
      // For table, usually, no special transformation is needed, just return raw data
      return rawData;
    case ChartType.SCATTER: {
      const xField = chartConfig.xField;
      const yField = chartConfig.yField;
      if (!xField || !yField) {
        throw new CustomError(400, 'xField and yField are required for scatter charts.');
      }
      return rawData.map(row => ({
        [xField]: row[xField],
        [yField]: row[yField],
        ...row // Include other fields for tooltip/interaction
      }));
    }
    case ChartType.GAUGE: {
      // Gauge charts typically need a single value.
      // Assuming the first value of the specified field in the first row.
      const valueField = chartConfig.valueField;
      if (!valueField || rawData.length === 0) {
        throw new CustomError(400, 'valueField is required for gauge charts, and data must not be empty.');
      }
      return [{ value: rawData[0][valueField] }];
    }
    default:
      logger.warn(`Unsupported chart type for transformation: ${chartType}`);
      return rawData; // Fallback to raw data
  }
};
```