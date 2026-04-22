```typescript
export interface User {
    id: string;
    email: string;
    role: string;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

export enum DataSourceType {
    POSTGRES = "postgresql",
    MYSQL = "mysql",
    MONGODB = "mongodb",
    CSV_UPLOAD = "csv_upload"
}

export interface DataSource {
    id: string;
    name: string;
    type: DataSourceType;
    connectionDetails: Record<string, any>;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Dashboard {
    id: string;
    name: string;
    description: string;
    userId: string;
    charts?: Chart[]; // Charts can be loaded with the dashboard
    createdAt: string;
    updatedAt: string;
}

export enum ChartType {
    BAR = "bar",
    LINE = "line",
    PIE = "pie",
    SCATTER = "scatter",
    TABLE = "table"
}

export interface Chart {
    id: string;
    name: string;
    type: ChartType;
    configuration: Record<string, any>; // For Recharts/Nivo configs
    query: string; // SQL query for data retrieval
    dashboardId: string;
    dataSourceId: string;
    createdAt: string;
    updatedAt: string;
}
```