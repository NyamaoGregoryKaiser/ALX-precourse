# Base image
FROM python:3.11-slim-buster

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python dependencies
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY ./app /app/app
COPY ./alembic /app/alembic
COPY ./scripts /app/scripts
COPY ./alembic.ini /app/alembic.ini
COPY ./.env.example /app/.env.example # Copy example, use .env from host or build arg

# Expose port
EXPOSE 8000

# Command to run the application
# For production, use Gunicorn with Uvicorn workers
# CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
# For development, you can use Uvicorn directly with auto-reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```