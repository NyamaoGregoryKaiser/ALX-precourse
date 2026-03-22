```typescript
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string; // In a real app, handle refresh token securely
}

export interface Database {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlserver' | 'oracle';
  connectionString: string; // Should be masked or not returned to frontend in production
  description?: string;
  ownerId: string;
  owner?: User; // Joined on backend
  createdAt: string;
  updatedAt: string;
}

export interface SlowQuery {
  id: string;
  query: string;
  executionTimeMs: number;
  clientApplication?: string;
  clientHostname?: string;
  databaseId: string;
  database: Database;
  reporterId?: string;
  reporter?: User;
  reportedAt: string;
  updatedAt: string;
  queryPlans: QueryPlan[];
  querySuggestions: QuerySuggestion[];
}

export interface QueryPlan {
  id: string;
  slowQueryId: string;
  planData: object;
  format: 'json' | 'text' | 'xml';
  totalCost?: number;
  actualRows?: number;
  generatedAt: string;
}

export type SuggestionType = 'index_creation' | 'query_rewrite' | 'partitioning' | 'statistics_update' | 'other';
export type SuggestionStatus = 'pending' | 'applied' | 'dismissed';

export interface QuerySuggestion {
  id: string;
  slowQueryId: string;
  type: SuggestionType;
  description: string;
  sqlStatement?: string;
  status: SuggestionStatus;
  suggestedAt: string;
  appliedAt?: string;
  dismissedAt?: string;
  feedback?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PagingOptions {
  page?: number;
  limit?: number;
  databaseId?: string;
  minExecutionTimeMs?: number;
  sortBy?: 'executionTimeMs' | 'reportedAt';
  sortOrder?: 'ASC' | 'DESC';
}
```

#### `frontend/src/services/api.ts`