# Use an official Python runtime as a parent image
FROM python:3.11-slim-bookworm

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for psycopg2 and others
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Run alembic migrations
# This will run migrations automatically when the container starts.
# In a real production environment, you might want a separate migration job
# or control this more carefully. For this example, it's integrated.
RUN alembic upgrade head

# Define environment variable for production
ENV PYTHONUNBUFFERED=1

# Command to run the application using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```