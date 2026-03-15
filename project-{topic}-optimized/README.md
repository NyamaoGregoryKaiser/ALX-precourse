# Payment Processing System

This project is a comprehensive, production-ready payment processing system built with Node.js, Express, and PostgreSQL. It's designed to handle customer management, secure payment transactions, and integrate with external services via webhooks.

## Features

*   **Customer Management:** CRUD operations for customers with role-based access.
*   **Payment Methods:** Securely store and manage various payment methods (cards, bank transfers) linked to customers.
*   **Transaction Processing:** Initiate and manage debit/credit transactions, with simulated asynchronous processing and status updates.
*   **Authentication & Authorization:** JWT-based authentication, role-based access control (RBAC).
*   **Webhooks:** System for dispatching transaction-related events to registered external endpoints.
*   **Logging & Monitoring:** Centralized logging with Winston and HTTP request logging with Morgan.
*   **Error Handling:** Centralized error handling middleware.
*   **Caching:** In-memory caching for frequently accessed data.
*   **Rate Limiting:** Protects API from abuse and denial-of-service attacks.
*   **Database:** PostgreSQL with Sequelize ORM, including migrations and seeders.
*   **Containerization:** Docker and Docker Compose for easy setup and deployment.
*   **Testing:** Unit, integration, and performance tests.
*   **API Documentation:** OpenAPI/Swagger for interactive API exploration.
*   **Frontend:** Simple vanilla JS frontend for demonstration.

## Setup Instructions

### Prerequisites

*   Node.js (v18+)
*   npm (v9+)
*   Docker & Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/your-username/payment-processing-system.git
cd payment-processing-system
```

### 2. Environment Variables

Create a `.env` file in the root directory based on `.env.example`.

```bash
cp .env.example .env
```

Edit the `.env` file with your desired database credentials and JWT secret.

### 3. Start with Docker Compose (Recommended)

This will set up both the PostgreSQL database and the Node.js application.

```bash
docker-compose up --build -d
```

This command will:
*   Build the `app` Docker image.
*   Start the `db` (PostgreSQL) container.
*   Start the `app` (Node.js) container.

Wait for the `db` service to report healthy (can take a few seconds). You can check logs with `docker-compose logs -f db`.

### 4. Run Database Migrations and Seeders

Once the `app` container is running, you can execute commands inside it.

```bash
docker exec -it <container-id-of-app> npm run db:migrate
docker exec -it <container-id-of-app> npm run db:seed
```
Replace `<container-id-of-app>` with the actual ID or name of your running `app` container (e.g., `payment-processing-system-app-1`). You can find it using `docker ps`.

This will create tables and seed an `admin@example.com` (password: `adminpassword123`) and a `customer@example.com` (password: `customerpassword123`) user.

### 5. Access the Application

*   **Backend API:** `http://localhost:3000/api/v1`
*   **API Documentation (Swagger UI):** `http://localhost:3000/api-docs`
*   **Frontend:** `http://localhost:3000/` (Serves `public/index.html`)

### 6. Running Tests

To run all tests:
```bash
docker exec -it <container-id-of-app> npm test
```

To run specific test types:
```bash
docker exec -it <container-id-of-app> npm run test:unit
docker exec -it <container-id-of-app> npm run test:integration
docker exec -it <container-id-of-app> npm run test:coverage
```

### Development (without Docker for app)

If you prefer to run the Node.js app directly on your host while still using Docker for the database:

1.  **Start Database:**
    ```bash
    docker-compose up db -d
    ```
2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```
3.  **Run Migrations & Seeders:**
    ```bash
    npm run db:migrate
    npm run db:seed
    ```
4.  **Start the Node.js application:**
    ```bash
    npm run dev # for development with nodemon
    # or
    npm start # for production build
    ```

---
[... rest of README, including API usage examples, contributing, license etc.]