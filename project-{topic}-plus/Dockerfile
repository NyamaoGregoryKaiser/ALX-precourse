```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.10-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Set environment variables (these can be overridden by docker-compose or Kubernetes)
ENV FLASK_APP=manage.py
ENV FLASK_ENV=production

# Expose the port the app runs on
EXPOSE 5000

# Run Gunicorn to serve the Flask application
# Using a custom manage.py entry point (which handles app creation)
# Ensure manage.py has a callable 'create_app' or similar if not directly using 'flask run'
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "manage:app"]
```