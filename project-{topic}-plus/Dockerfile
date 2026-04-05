# Use a slim Python image for a smaller footprint
FROM python:3.11-slim-buster

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

# Expose port 8000 for the Gunicorn server
EXPOSE 8000

# Run migrations and start Gunicorn server
# CMD ["gunicorn", "--bind", "0.0.0.0:8000", "my_enterprise_cms.wsgi:application"]
# Use a script for robustness
CMD ["/app/docker-entrypoint.sh"]
```