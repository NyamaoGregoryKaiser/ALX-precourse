# My Enterprise CMS (Content Management System)

A comprehensive, production-ready Content Management System built with Django, Django REST Framework, and HTMX. This project aims to demonstrate a full-stack application following best practices in software engineering, including a robust backend, interactive frontend, database management, testing, deployment, and comprehensive documentation.

## Table of Contents

1.  [Features](#features)
2.  [Architecture](#architecture)
3.  [Setup Guide](#setup-guide)
    *   [Prerequisites](#prerequisites)
    *   [Local Development with Docker](#local-development-with-docker)
    *   [Local Development without Docker](#local-development-without-docker)
4.  [Usage](#usage)
    *   [Admin Panel](#admin-panel)
    *   [Web Interface](#web-interface)
    *   [API Endpoints](#api-endpoints)
5.  [Testing](#testing)
6.  [Deployment Considerations](#deployment-considerations)
7.  [CI/CD](#cicd)
8.  [Credits & License](#credits--license)

## 1. Features

**Core CMS Functionality:**
*   **Content Types:** Articles and Pages, inheriting from a base `Content` model.
*   **Categorization & Tagging:** Organize content with Categories and Tags.
*   **Media Management:** Upload and manage image/file assets.
*   **Commenting System:** Users can comment on content, with moderation (approval).
*   **Content Status:** Draft, Published, Archived.
*   **Search:** Full-text search across content titles, excerpts, and bodies.

**User Management & Authentication:**
*   Custom User model extending Django's `AbstractUser`.
*   User registration, login, logout, password reset.
*   User profiles with custom fields (profile picture, bio).
*   Role-based access control (Staff, Superuser, Regular User).

**API & Integration:**
*   **RESTful API:** Powered by Django REST Framework (DRF) with full CRUD operations for all major models.
*   **JWT Authentication:** Secure API access using JSON Web Tokens.
*   **OpenAPI/Swagger Documentation:** Auto-generated API documentation using `drf-spectacular`.
*   **Rate Limiting:** Protects API endpoints from abuse.
*   **CORS Support:** Configurable for frontend integrations.

**Technical Excellence:**
*   **Python/Django:** Robust, scalable backend.
*   **PostgreSQL:** Production-ready database.
*   **Docker:** Containerization for consistent environments.
*   **Comprehensive Testing:** Unit, Integration, API, and basic Performance tests.
*   **Logging & Monitoring:** Structured logging with file and console handlers, admin email notifications.
*   **Error Handling:** Custom 404/500 pages, DRF exception handling.
*   **Caching:** Configurable caching layer (e.g., Redis).
*   **Query Optimization:** Demonstrates `select_related` and `prefetch_related` for N+1 problem.
*   **CI/CD:** Basic GitHub Actions workflow for automated testing.

## 2. Architecture

The project follows a modular Django application structure:

*   **`my_enterprise_cms/` (Project Root):** Contains global settings, URL routing, and WSGI configuration.
*   **`core_users/` (Django App):** Manages user authentication, authorization, and profiles. Extends Django's `AbstractUser` model. Includes API endpoints for user management.
*   **`cms_app/` (Django App):** The core content management logic.
    *   **Models:** Define `Category`, `Tag`, `MediaFile`, `Article`, `Page`, `Comment` (using `GenericForeignKey`).
    *   **Views:** Both traditional Django class-based views for server-rendered HTML (with HTMX for partial updates) and DRF ViewSets/Generics for the REST API.
    *   **Forms:** For creating and updating content via the web interface.
    *   **Serializers:** For converting Django models to JSON/XML for the API.
    *   **Permissions:** Custom permission classes for fine-grained access control.
    *   **Admin:** Configured for all models, with custom display and actions.
*   **`templates/` (Global):** Base HTML templates shared across apps.
*   **`static/` (Global):** Project-level static assets (CSS, JS).
*   **`media/`:** Stores user-uploaded media files.
*   **`nginx/`:** Nginx configuration for reverse proxy and static/media serving.
*   **`docker-compose.yml`:** Orchestrates Django app and PostgreSQL database.
*   **`Dockerfile`:** Defines the Docker image for the Django application.
*   **`.env.example`:** Template for environment variables.
*   **`requirements.txt`:** Python dependencies.
*   **`cms_app/management/commands/seed_db.py`:** Custom management command to populate the database with dummy data for development.

## 3. Setup Guide

### Prerequisites

*   Python 3.11+
*   pip (Python package installer)
*   Git
*   Docker and Docker Compose (recommended for easy setup)
*   Node.js/npm (if you plan to use a separate frontend framework, but not strictly needed for this Django+HTMX setup)

### Local Development with Docker (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/my-enterprise-cms.git # Replace with your repo
    cd my-enterprise-cms
    ```

2.  **Create `.env` file:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and fill in `SECRET_KEY`, and if you plan to use PostgreSQL, update `DATABASE_URL` to point to the `db` service as defined in `docker-compose.yml`:
    ```ini
    # .env
    DEBUG=True
    SECRET_KEY=YOUR_VERY_LONG_AND_RANDOM_SECRET_KEY # IMPORTANT: Change this!
    DATABASE_URL=postgres://cms_user:cms_password@db:5432/cms_db # Matches docker-compose.yml
    CACHE_URL=locmemcache:// # Or redis://redis:6379/1 if you add a Redis service
    ALLOWED_HOSTS=.localhost,127.0.0.1
    # ... other settings
    ```

3.  **Build and run containers:**
    ```bash
    docker compose up --build
    ```
    This command will:
    *   Build the Django application image.
    *   Start the PostgreSQL database.
    *   Start the Gunicorn server for the Django app.
    *   Start Nginx to proxy requests and serve static/media files.
    *   Automatically wait for the DB, run migrations, collect static files, and seed initial data (if `DEBUG=True` and no users exist).

4.  **Access the application:**
    *   Web Interface: `http://localhost/`
    *   Django Admin: `http://localhost/admin/`
    *   API Root: `http://localhost/api/v1/`
    *   API Docs (Swagger UI): `http://localhost/api/schema/swagger-ui/`
    *   API Docs (ReDoc): `http://localhost/api/schema/redoc/`

    **Default Admin Credentials (after seeding):**
    *   Username: `admin`
    *   Password: `adminpassword`
    **Default Test User Credentials (after seeding):**
    *   Username: `testuser`
    *   Password: `testpassword`

### Local Development without Docker

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/my-enterprise-cms.git
    cd my-enterprise-cms
    ```

2.  **Create a virtual environment and install dependencies:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

3.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Update `SECRET_KEY` and ensure `DATABASE_URL` points to a local SQLite file or your local PostgreSQL instance (e.g., `DATABASE_URL=sqlite:///db.sqlite3`).

4.  **Run migrations:**
    ```bash
    python manage.py migrate
    ```

5.  **Create a superuser:**
    ```bash
    python manage.py createsuperuser
    ```
    Follow the prompts to create an admin user.

6.  **Seed initial data (optional but recommended for dev):**
    ```bash
    python manage.py seed_db --count 20
    ```
    This will create dummy articles, pages, categories, tags, and media files, plus a `testuser` (testuser/testpassword).

7.  **Collect static files:**
    ```bash
    python manage.py collectstatic --noinput
    ```

8.  **Start the development server:**
    ```bash
    python manage.py runserver
    ```
    Access the application at `http://127.0.0.1:8000/`.

## 4. Usage

### Admin Panel

Access the Django Admin at `/admin/`. Use your superuser credentials to log in. Here you can manage all aspects of the CMS: users, content, categories, tags, media files, and comments.

### Web Interface

The main web interface provides:
*   **Homepage (`/`):** Displays recent articles and pages.
*   **Articles (`/articles/`):** List and detail views for articles.
*   **Pages (`/pages/`):** List and detail views for static pages.
*   **Categories (`/categories/`):** Browse content by category.
*   **Tags (`/tags/`):** Browse content by tag.
*   **Search (`/search/?q=query`):** Search functionality across content.
*   **User Profiles (`/accounts/<username>/`):** View and edit user profiles.
*   **Content Creation/Editing:** Authenticated users can create/edit their own articles/pages. Staff users can manage all content, categories, tags, and media.

The web interface utilizes HTMX for dynamic interactions (e.g., submitting comments without full page reloads, deleting items).

### API Endpoints

The API is available under `/api/v1/`. You can explore the endpoints and their schemas using the Swagger UI or ReDoc.

**Base URL:** `http://localhost/api/v1/` (or `http://127.0.0.1:8000/api/v1/` without Nginx)

**Authentication:**
*   **Get JWT Token:** `POST /api/v1/token/` (send `username`, `password`)
*   **Refresh Token:** `POST /api/v1/token/refresh/`
*   **Verify Token:** `POST /api/v1/token/verify/`

Once you have an `access` token, include it in your requests as an `Authorization` header: `Authorization: Bearer <your_access_token>`.

**Key Endpoints:**

*   **Users:**
    *   `POST /api/v1/users/register/` - Register a new user.
    *   `GET /api/v1/users/` - List all active users.
    *   `GET /api/v1/users/<username>/` - Retrieve a user's profile.
    *   `GET /api/v1/users/me/` - Retrieve authenticated user's profile.
    *   `PUT/PATCH /api/v1/users/<username>/` - Update a user's profile (owner or admin only).
*   **Content (Articles, Pages):**
    *   `GET /api/v1/cms/articles/` - List published articles.
    *   `POST /api/v1/cms/articles/` - Create a new article (authenticated users).
    *   `GET /api/v1/cms/articles/<slug>/` - Retrieve an article.
    *   `PUT/PATCH /api/v1/cms/articles/<slug>/` - Update an article (author or admin).
    *   `DELETE /api/v1/cms/articles/<slug>/` - Delete an article (author or admin).
    *   `POST /api/v1/cms/articles/<slug>/publish/` - Publish an article.
    *   `POST /api/v1/cms/articles/<slug>/unpublish/` - Unpublish an article.
    *   (Similar endpoints for `/api/v1/cms/pages/`)
*   **Categories:** `GET, POST, PUT, PATCH, DELETE /api/v1/cms/categories/` (read-only for non-staff, full CRUD for staff).
*   **Tags:** `GET, POST, PUT, PATCH, DELETE /api/v1/cms/tags/` (read-only for non-staff, full CRUD for staff).
*   **Media Files:** `GET, POST, PUT, PATCH, DELETE /api/v1/cms/media/` (read-only for non-staff, full CRUD for staff).
*   **Comments:**
    *   `GET /api/v1/cms/<content_type_id>/<object_id>/comments/` - List approved comments for an article/page.
    *   `POST /api/v1/cms/<content_type_id>/<object_id>/comments/` - Post a new comment (authenticated users).
    *   `GET /api/v1/cms/comments/<id>/` - Retrieve a specific comment.
    *   `PUT/PATCH /api/v1/cms/comments/<id>/` - Update a comment (comment author or staff).
    *   `DELETE /api/v1/cms/comments/<id>/` - Delete a comment (comment author or staff).
    *   `POST /api/v1/cms/comments/<id>/approve/` - Approve a comment (admin only).
    *   `POST /api/v1/cms/comments/<id>/unapprove/` - Unapprove a comment (admin only).

## 5. Testing

The project includes a comprehensive test suite covering:

*   **Unit Tests:** For models (`cms_app/tests/test_models.py`).
*   **Integration Tests:** For Django views (`cms_app/tests/test_views.py`) simulating user interactions with the web interface.
*   **API Tests:** For Django REST Framework endpoints (`cms_app/tests/test_api.py`) verifying API behavior, permissions, and data integrity.
*   **Performance Tests:** Basic tests to identify N+1 query problems and measure query efficiency (`cms_app/tests/test_performance.py`).

To run all tests:

```bash
python manage.py test
```

For more detailed output including coverage, you would typically use `pytest` with `pytest-django` and `pytest-cov`.
*(Note: `pytest` setup is not fully included here but is a common next step for enterprise projects).*

## 6. Deployment Considerations

For production deployment, consider the following:

*   **Environment Variables:** Securely manage sensitive information (e.g., `SECRET_KEY`, `DATABASE_URL`) using environment variables. Tools like `django-environ` are already integrated.
*   **Database:** Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL).
*   **Static & Media Files:**
    *   **Static:** Use `whitenoise` (already included) for serving static files directly from Django in a simple setup, or an external CDN/storage service (AWS S3, Google Cloud Storage) for high traffic.
    *   **Media:** Definitely use an external storage service (AWS S3, Google Cloud Storage) for user-uploaded media. This requires configuring Django's `DEFAULT_FILE_STORAGE` setting (e.g., using `django-storages`).
*   **Web Server:** Use a production-ready WSGI server like `Gunicorn` (included in `Dockerfile` and `docker-compose.yml`).
*   **Reverse Proxy:** Use `Nginx` (configured in `docker-compose.yml`) to serve static/media files directly and proxy dynamic requests to Gunicorn.
*   **Caching:** Integrate a robust caching solution like `Redis` (`django-redis` is a common library). Update `CACHE_URL` in `.env`.
*   **Logging:** Configure `LOGGING` in `settings.py` to send logs to a centralized logging service (ELK stack, CloudWatch Logs, Splunk).
*   **Error Reporting:** Integrate with error monitoring tools like Sentry.
*   **HTTPS:** Always use HTTPS for production to encrypt traffic. Configure your Nginx or load balancer for SSL termination.
*   **Backup Strategy:** Implement regular database backups and file storage backups.
*   **Monitoring:** Set up application and infrastructure monitoring (CPU, memory, disk, request rates, error rates).
*   **Security:**
    *   Ensure `DEBUG` is `False` in production.
    *   Use strong, unique `SECRET_KEY`.
    *   Configure `ALLOWED_HOSTS` correctly.
    *   Regularly update dependencies.
    *   Perform security audits.

## 7. CI/CD

A basic GitHub Actions workflow is provided (`.github/workflows/ci.yml`) to automate code quality checks and testing. This workflow will:

1.  **Checkout code.**
2.  **Set up Python environment.**
3.  **Install dependencies.**
4.  **Run migrations** (or a simple check that migrations are up-to-date).
5.  **Run tests.**
6.  **(Optional):** Add linting, static analysis (`flake8`, `mypy`), security scanning.
7.  **(Optional):** Build and push Docker images to a container registry.
8.  **(Optional):** Deploy to a cloud provider.

This `ci.yml` file will be a starting point for more complex pipelines.

## 8. Credits & License

*   **Developed by:** [Your Name/ALX Student]
*   **Frameworks & Libraries:** Django, Django REST Framework, HTMX, Docker, PostgreSQL, etc.
*   **License:** MIT License (or your preferred open-source license).

```
MIT License

Copyright (c) [Year] [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```