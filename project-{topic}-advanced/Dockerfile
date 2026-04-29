# Base image
FROM python:3.9-slim-buster

# Set working directory
WORKDIR /app

# Install system dependencies required for psycopg2-binary
# and potentially other libraries (like building wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application using Gunicorn for production
# Gunicorn is a WSGI HTTP Server for UNIX. It's stable and widely used.
# The `manage.py` file is our Flask entry point, and `app` is the Flask app instance.
# -w: number of worker processes
# -b: bind to host:port
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "manage:app"]
```