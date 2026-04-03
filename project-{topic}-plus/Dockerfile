# Use a lightweight Python base image
FROM python:3.11-slim-buster

# Set environment variables for non-interactive execution
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# Set the working directory in the container
WORKDIR /app

# Copy requirements file and install dependencies
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the application code
COPY ./app /app/app
COPY ./main.py /app/main.py
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini
COPY ./seed_data.py /app/seed_data.py

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the application using uvicorn
# Use Gunicorn with Uvicorn workers for production for better process management
# Example: gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
# For simplicity, using direct uvicorn for this example.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]