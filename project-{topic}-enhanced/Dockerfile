```dockerfile
# Use a slim Python base image
FROM python:3.11-slim-buster

# Set environment variables for non-interactive execution
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy only requirements.txt first to leverage Docker cache
COPY ./requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the application code
COPY ./app /app/app
COPY ./alembic /app/alembic
COPY ./scripts /app/scripts
COPY ./alembic.ini /app/alembic.ini

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the application using Uvicorn
# Using gunicorn as a process manager for uvicorn workers for production readiness
# Replace with: CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# for simple development setup without gunicorn.
# For production, consider using a proper process manager like Gunicorn with Uvicorn workers.
# Here we use a simpler command for clarity in this comprehensive example,
# but for true enterprise-grade, Gunicorn setup (e.g., `gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app`) is recommended.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```