# Use a lightweight official Python image
FROM python:3.10-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV FLASK_APP=manage.py
ENV FLASK_ENV=production # Set to development for local dev, production for deployment
ENV PYTHONUNBUFFERED=1 # Ensures Python output is sent immediately to the terminal

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application using Gunicorn for production
# -w N: Number of worker processes (e.g., (2 * num_cores) + 1)
# -b 0.0.0.0:5000: Binds to all network interfaces on port 5000
# manage:app: Refers to the Flask app instance named 'app' in 'manage.py'
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "manage:app"]