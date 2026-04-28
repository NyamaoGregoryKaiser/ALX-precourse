#!/bin/sh

echo "Waiting for database to be ready..."
/usr/bin/wait-for-it.sh db:5432 -t 30 -- echo "Database is up and running!"

echo "Running TypeORM migrations..."
# Assuming typeorm.config.ts and dist are correctly copied
npm run typeorm migration:run

echo "Running seed data..."
npm run seed:run

echo "Starting NestJS application..."
exec "$@"
```
*(Note: `wait-for-it.sh` is a dependency that needs to be added to the Docker image for robust startup. This can be done with `curl` or by adding it directly to the `backend/Dockerfile` as an additional `COPY` and `RUN chmod +x`.)*

### `frontend/Dockerfile`

```dockerfile