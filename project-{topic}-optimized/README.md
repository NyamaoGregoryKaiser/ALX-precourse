.
├── .github/                                # GitHub Actions workflows
│   └── workflows/
│       └── maven.yml                       # CI/CD pipeline for build, test, and deploy
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/alx/scrapingtools/
│   │   │       ├── ScrapingToolsApplication.java # Main Spring Boot entry point
│   │   │       ├── auth/                   # Authentication and Authorization module
│   │   │       │   ├── controller/
│   │   │       │   ├── dto/
│   │   │       │   ├── filter/
│   │   │       │   ├── service/
│   │   │       │   └── util/
│   │   │       ├── common/                 # Common utilities, exceptions, and filters
│   │   │       ├── config/                 # Spring application configurations
│   │   │       ├── scheduler/              # Scheduled scraping job initiation
│   │   │       ├── scraper/                # Core scraping logic module
│   │   │       │   ├── controller/
│   │   │       │   ├── dto/
│   │   │       │   ├── mapper/
│   │   │       │   ├── model/
│   │   │       │   ├── repository/
│   │   │       │   └── service/
│   │   │       ├── user/                   # User management module
│   │   │       │   ├── model/
│   │   │       │   ├── repository/
│   │   │       │   └── service/
│   │   │       └── util/                   # General purpose utilities (WebScraper, error handling)
│   │   └── resources/
│   │       ├── application.yml             # Spring Boot application configuration
│   │       └── db/migration/               # Flyway database migration scripts
│   └── test/
│       └── java/
│           └── com/alx/scrapingtools/
│               ├── auth/                   # Unit tests for auth module
│               ├── integration/            # Integration tests with Testcontainers
│               └── scraper/                # Unit tests for scraper module
├── Dockerfile                              # Docker build instructions for the application
├── docker-compose.yml                      # Docker Compose for local development (app + db)
├── docker-compose.test.yml                 # Docker Compose for Testcontainers setup in CI
├── mvnw                                    # Maven Wrapper script
├── mvnw.cmd                                # Maven Wrapper script for Windows
├── .mvn/                                   # Maven Wrapper configuration
└── pom.xml                                 # Maven project object model (dependencies, build config)
├── README.md                               # Comprehensive project documentation