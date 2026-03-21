# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed for psycopg2 (if using PostgreSQL)
# RUN apt-get update && apt-get install -y \
#     libpq-dev \
#     gcc \
#     && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables for Gunicorn and Flask
ENV FLASK_APP=main.py
ENV FLASK_ENV=production
# In production, these should be managed by your orchestrator or CI/CD
# ENV SECRET_KEY="your_production_secret_key"
# ENV JWT_SECRET_KEY="your_production_jwt_secret_key"
# ENV SQLALCHEMY_DATABASE_URI="postgresql://user:password@db:5432/mydatabase" # Example for PostgreSQL

# Command to run the application using Gunicorn
# Adjust workers and threads based on your server's CPU cores and expected load
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "2", "main:app"]
```