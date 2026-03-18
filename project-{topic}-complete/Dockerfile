```dockerfile
# Use a lightweight Python base image
FROM python:3.9-slim-buster

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV APP_HOME /app
WORKDIR $APP_HOME

# Install system dependencies for psycopg2 and other tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        postgresql-client \
        git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . $APP_HOME

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the application using Uvicorn
# The actual command will be in docker-compose for better flexibility
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```