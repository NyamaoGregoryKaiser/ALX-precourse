import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
```

---

### 3. Database Layer

*   **Schema Definitions:** Handled by TypeORM entities (`User.ts`, `Project.ts`, `Task.ts`) with decorators.
*   **Migration Scripts:** Example `1700000000000-InitialSeed.ts` generated. Commands in `package.json` for `migration:create`, `migration:generate`, `migration:run`, `migration:revert`.
*   **Seed Data:** `run-seeds.ts` orchestrates `user.seed.ts`, `project.seed.ts`, `task.seed.ts`. Command `npm run seed`.
*   **Query Optimization:**
    *   **Indexing:** TypeORM creates indexes for primary keys and foreign keys by default. For frequently queried columns (like `email` on `User`, `ownerId` on `Project`, `projectId` and `assignedToId` on `Task`), TypeORM implicitly adds indexes when relationships are defined, or you can explicitly add `@Index()` decorators.
    *   **Efficient Queries:** The repositories use TypeORM's `find`, `findOne`, `createQueryBuilder` with `relations` to minimize N+1 queries.
    *   **Connection Pooling:** `data-source.ts` includes `extra` options for `max` connections and timeouts to manage database resources efficiently.

---

### 4. Configuration & Setup

#### `docker-compose.yml`
```yaml