task-management-system/
├── backend/
│   ├── src/main/java/com/alx/task_management_system/
│   │   ├── config/             # Spring configurations (Security, OpenAPI, Cache)
│   │   ├── controller/         # REST API endpoints
│   │   ├── dto/                # Data Transfer Objects
│   │   ├── entity/             # JPA Entities
│   │   ├── exception/          # Custom exceptions
│   │   ├── filter/             # Custom servlet filters (e.g., rate limiting, JWT)
│   │   ├── mapper/             # MapStruct interfaces
│   │   ├── repository/         # Spring Data JPA repositories
│   │   ├── security/           # JWT utilities, user details service
│   │   ├── service/            # Business logic
│   │   ├── util/               # Utility classes
│   │   └── TaskManagementSystemApplication.java
│   ├── src/main/resources/
│   │   ├── application.yml     # Main application properties
│   │   ├── db/migration/       # Flyway SQL migration scripts
│   │   └── logback-spring.xml  # Logging configuration
│   ├── src/test/java/com/alx/task_management_system/
│   │   ├── controller/
│   │   ├── repository/
│   │   ├── service/
│   │   └── security/
│   ├── pom.xml
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── Dockerfile
│   └── .env
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── docker-compose.yml
├── README.md
├── ARCHITECTURE.md
├── DEPLOYMENT.md
└── performance-test/
    └── jmeter-plan.jmx (conceptual)