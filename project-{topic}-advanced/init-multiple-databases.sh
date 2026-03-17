```bash
#!/bin/bash
set -e

# Create databases as specified in docker-compose.yml
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE alx_mobile_db;
    GRANT ALL PRIVILEGES ON DATABASE alx_mobile_db TO alxuser;
    ALTER USER alxuser WITH PASSWORD 'alxpassword';

    CREATE DATABASE alx_mobile_db_dev;
    CREATE USER alxuser_dev WITH PASSWORD 'alxpassword_dev';
    GRANT ALL PRIVILEGES ON DATABASE alx_mobile_db_dev TO alxuser_dev;
EOSQL
```

#### CI/CD Pipeline Configuration (GitHub Actions)