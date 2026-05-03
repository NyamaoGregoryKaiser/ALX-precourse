```dockerfile
# Dockerfile for the ALX-Shop FastAPI application

# Use an official Python runtime as a parent image
# We choose a lightweight image with Python for smaller final image size.
FROM python:3.11-slim-bookworm

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for psycopg2 and other libraries
# python-dev, gcc, and postgresql-client are common for database drivers.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file first to leverage Docker layer caching
# If requirements.txt doesn't change, this layer won't be rebuilt.
COPY requirements.txt .

# Install Python dependencies
# --no-cache-dir: Don't store cache locally in the container, saves space.
# --compile: Compile Python source files to bytecode to speed up startup.
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose the port on which the FastAPI application will run
EXPOSE 8000

# Set environment variables (optional, but good for defining default behavior)
# These can be overridden via docker-compose.yml or 'docker run -e'
ENV PYTHONUNBUFFERED=1 \
    LOG_LEVEL=INFO \
    PROJECT_NAME="ALX-Shop API" \
    ENVIRONMENT="production" \
    # Default non-secret values, secrets will come from .env or docker-compose
    REDIS_URI="redis://redis:6379/0" # Point to Redis service in docker-compose

# Command to run the application using Uvicorn
# --host 0.0.0.0 binds to all network interfaces inside the container.
# --port 8000 specifies the port.
# --workers 4 (or number of CPU cores) for production readiness to handle concurrent requests.
# --proxy-headers for when behind a reverse proxy (like Nginx, or cloud load balancers).
# --log-level can be overridden by LOG_LEVEL env var in app/core/logging_config.py
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers"]

```