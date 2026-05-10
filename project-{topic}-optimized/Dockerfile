# Use a slim Python image for smaller size
FROM python:3.11-slim-buster

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# Set working directory
WORKDIR /app

# Install system dependencies (optional, adjust as needed)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     build-essential \
#     libpq-dev \
#     && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install dependencies
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the application code
COPY . /app

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the application using Uvicorn
# Use Gunicorn to manage Uvicorn workers in production for robustness
# For a simple single worker:
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# For a production-ready setup with Gunicorn (install gunicorn in requirements.txt)
# CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

#### `docker-compose.yml`
```yaml