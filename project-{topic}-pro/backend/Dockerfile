```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.11-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for psycopg2-binary
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    # Remove these if psycopg2-binary pre-compiled wheels work for your architecture
    # python3-dev \
    # musl-dev \
    # libpq-dev \
    # Add any other build dependencies
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose port 8000 for FastAPI
EXPOSE 8000

# Command to run the application (overridden by docker-compose for development)
# For production, you'd likely use gunicorn + uvicorn workers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```