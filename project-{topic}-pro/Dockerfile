```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.10-slim-buster

# Set the working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies for psycopg2 and others
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy the rest of the application code into the working directory
COPY . .

# Expose port 5000 for the Flask application
EXPOSE 5000

# Run Flask application using Gunicorn
# Adjust workers based on CPU cores (2 * NUM_CORES + 1 is a common formula)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "wsgi:app"]
```