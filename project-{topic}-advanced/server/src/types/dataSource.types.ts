export enum DataSourceType {
  POSTGRESQL = 'POSTGRESQL',
  MYSQL = 'MYSQL',
  CSV_UPLOAD = 'CSV_UPLOAD',
  API = 'API', // Future expansion
}

export interface PostgresConnectionDetails {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  sslMode?: 'require' | 'prefer' | 'disable';
}

export type ConnectionDetails = PostgresConnectionDetails; // Expand as more types are added