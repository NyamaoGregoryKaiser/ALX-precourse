```dockerfile
# Dockerfile

# Use an official Python runtime as a parent image
FROM python:3.10-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for psycopg2 and other packages
# psycopg2-binary requires libpq-dev
# Gunicorn requires gcc
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    build-essential \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application code into the container
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables for Gunicorn and Flask
ENV FLASK_APP=manage.py
ENV FLASK_RUN_HOST=0.0.0.0

# Command to run the application using Gunicorn (production server)
# Gunicorn with 4 workers and bind to all interfaces on port 5000
# --timeout 120 (seconds) for potentially long running requests (e.g. initial metric collection)
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app:create_app()"]
```