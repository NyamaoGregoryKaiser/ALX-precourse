# Use a slim Python image for smaller size
FROM python:3.11-slim-bookworm

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV APP_HOME=/app

# Create and set working directory
WORKDIR $APP_HOME

# Install system dependencies required for psycopg2
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . $APP_HOME

# Expose the port FastAPI will run on
EXPOSE 8000

# Command to run the application
# Use uvicorn with gunicorn for production deployment (more robust process management)
# For development, just uvicorn is fine.
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] # For development with hot-reloads
CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]

```