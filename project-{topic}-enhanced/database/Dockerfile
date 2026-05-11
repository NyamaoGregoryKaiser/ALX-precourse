FROM postgres:15-alpine

COPY ./seed/seed_data.sql /docker-entrypoint-initdb.d/

# This Dockerfile for DB is mostly for seeding data easily on first run.
# The main DB config comes from docker-compose.yml.
```