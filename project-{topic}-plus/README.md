# Simple Task Manager API

This project implements a simple task manager API with a Python backend (Flask), PostgreSQL database, and Dockerized deployment.

## Features

* CRUD operations for tasks
* User authentication
* Basic error handling
* Dockerized for easy deployment
* CI/CD pipeline with GitHub Actions

## Setup

1. Clone the repository: `git clone <repository_url>`
2. Create a PostgreSQL database.
3. Update `.env` with database credentials.
4. Install dependencies: `pip install -r requirements.txt`
5. Run migrations: `alembic upgrade head`
6. Run the application: `docker-compose up`


## API Documentation

**(This section needs to be populated with Swagger/OpenAPI specifications or similar.)**

* `/tasks`:  GET, POST
* `/tasks/{id}`: GET, PUT, DELETE

## Architecture

**(Include a diagram or description of the system architecture.)**

## Deployment

1. Push code changes to GitHub.
2. GitHub Actions will build and deploy the Docker image.