```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for psycopg2 (PostgreSQL adapter) and build essentials
# This is required for `psycopg2-binary` and general Python package compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV FLASK_APP=run.py
ENV FLASK_CONFIG=production # Set to 'production' for default Docker deployments

# Expose the port the app runs on
EXPOSE 5000

# Run migrations (ensure database is up before this step in docker-compose)
# This command is typically run as part of an entrypoint or init script
# ENTRYPOINT ["/usr/local/bin/python", "run.py"] # We'll use a specific command with Gunicorn

# Command to run the application using Gunicorn (production-ready WSGI server)
# The scheduler runs as a background thread within this Gunicorn process.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "run:app"]

```