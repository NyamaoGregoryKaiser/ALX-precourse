# FastAPI and ASGI server
fastapi==0.111.0
uvicorn[standard]==0.30.1

# Database
psycopg2-binary==2.9.9
SQLAlchemy==2.0.30
alembic==1.13.1

# Utilities
python-dotenv==1.0.1
psutil==5.9.8            # System monitoring
passlib[bcrypt]==1.7.4   # Password hashing
PyJWT==2.8.0             # JSON Web Tokens
python-multipart==0.0.9  # Required for form data parsing in FastAPI
APScheduler==3.10.4      # Background scheduler
Jinja2==3.1.4            # Templating engine for frontend

# Testing
pytest==8.2.1
pytest-cov==5.0.0
httpx==0.27.0
pytest-benchmark==4.0.0  # For performance testing specific functions/endpoints
locust==2.26.0           # For load testing

# Linting/Formatting (optional, but good practice)
ruff==0.4.7
black==24.4.2
isort==5.13.2