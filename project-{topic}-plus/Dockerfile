# Use a lightweight Python base image
FROM python:3.10-slim-buster

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP manage.py
ENV FLASK_ENV production # Default to production, can be overridden by docker-compose

# Create and set the working directory
WORKDIR /app

# Install system dependencies (e.g., for psycopg2)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    # Clean up APT when done
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Run the application with Gunicorn
# Using 4 workers, binding to all interfaces on port 5000
# --log-level info: Set Gunicorn logging level
# --access-logfile -: Log access to stdout
# --error-logfile -: Log errors to stderr
# --timeout 120: Increase timeout for potentially long data processing requests
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", \
     "--log-level", "info", "--access-logfile", "-", "--error-logfile", "-", "manage:app"]