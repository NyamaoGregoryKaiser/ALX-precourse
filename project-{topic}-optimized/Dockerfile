# Use an official Python runtime as a parent image
FROM python:3.11-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose port 8000 for the FastAPI application
EXPOSE 8000

# Run the Uvicorn server, binding to all interfaces
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# Using gunicorn for production-ready deployment with multiple workers
CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```