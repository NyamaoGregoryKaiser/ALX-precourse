```dockerfile
# Use a lightweight base image for Python
FROM python:3.10-slim-buster

# Set environment variables for non-interactive commands
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (if any, e.g., for psycopg2-binary)
# This is often needed for database drivers
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the application runs on
EXPOSE 5000

# Command to run the application using Gunicorn (production-ready WSGI server)
# Use 4 workers, bind to 0.0.0.0, and specify the Flask app entry point
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app.main:app"]
```