.
├── .github/workflows/
│   └── ci.yml                        # GitHub Actions CI/CD
├── config/
│   └── flyway/
│       ├── V1__initial_schema.sql    # Database schema
│       └── V2__add_seed_data.sql     # Seed data
├── docs/
│   ├── api.md                        # API Documentation
│   ├── architecture.md               # Architecture Documentation
│   └── deployment.md                 # Deployment Guide
├── docker-compose.yml                # Docker Compose setup
├── Dockerfile                        # Application Dockerfile
├── pom.xml                           # Maven project file
├── README.md                         # Project README
└── src/
    ├── main/
    │   ├── java/com/alx/scrapineer/   # Core Java application
    │   │   ├── ScrapineerApplication.java
    │   │   ├── common/                # Utility, security config, DTOs
    │   │   ├── data/                  # JPA entities, repositories
    │   │   ├── api/                   # REST controllers, DTOs, exceptions
    │   │   ├── scheduler/             # Scheduled job logic
    │   │   └── scraper/               # Scraping engine, strategies, services
    │   └── resources/
    │       ├── application.yml         # Main configuration
    │       ├── application-dev.yml     # Development profile config
    │       ├── application-prod.yml    # Production profile config
    │       ├── logback-spring.xml      # Logging configuration
    │       └── templates/              # Basic Thymeleaf templates (for minimal UI)
    └── test/
        ├── java/com/alx/scrapineer/   # Tests (Unit, Integration, API)
        └── resources/
            └── application-test.yml    # Test profile config