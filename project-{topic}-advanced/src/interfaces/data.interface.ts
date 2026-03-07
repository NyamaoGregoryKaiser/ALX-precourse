```typescript
import { DataSourceType } from "../database/entities/DataSource";

export interface IDataSourceConnectionConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filePath?: string; // For CSV/JSON upload type
  headers?: string[]; // For CSV/JSON upload type
  // ... other database specific configs
}

export interface IQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

export interface IDataService {
  connect(config: IDataSourceConnectionConfig): Promise<any>;
  query(config: IDataSourceConnectionConfig, query: string, options?: IQueryOptions): Promise<any[]>;
  getSchema(config: IDataSourceConnectionConfig, query: string): Promise<Record<string, any>>;
  testConnection(config: IDataSourceConnectionConfig): Promise<boolean>;
}

export interface IDataSourceServiceMap {
  [key: string]: IDataService;
}

// Example data structure for chart configuration
export interface IChartConfiguration {
  xField: string;
  yField: string;
  seriesField?: string;
  angleField?: string; // For pie chart
  colorField?: string; // For pie chart
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  // ... other chart-specific options
}

export interface IDashboardLayout {
  // Example for react-grid-layout
  lg: { i: string; x: number; y: number; w: number; h: number; static?: boolean }[];
  md?: { i: string; x: number; y: number; w: number; h: number; static?: boolean }[];
  sm?: { i: string; x: number; y: number; w: number; h: number; static?: boolean }[];
}
```