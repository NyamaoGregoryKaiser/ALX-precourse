# Use a lightweight base image for Python applications
FROM python:3.9-slim-buster

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP=manage.py
ENV FLASK_RUN_HOST=0.0.0.0

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
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

# Expose port 5000 for the Flask application
EXPOSE 5000

# Command to run the application using Gunicorn (production-ready WSGI server)
# The `start.sh` script will be used to run the application, allowing for pre-startup tasks.
CMD ["./start.sh"]
```