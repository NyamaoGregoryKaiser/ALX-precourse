```Dockerfile
# Dockerfile for Python Inference Service
FROM python:3.9-slim-buster
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Expose the port Flask runs on
EXPOSE 5001
# Run Gunicorn for production-ready serving
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "app:app"]
```