appinsight/
├── src/main/java/com/appinsight/appinsight/
│   ├── AppInsightApplication.java
│   ├── config/
│   │   ├── CacheConfig.java
│   │   └── SecurityConfig.java
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── MetricController.java
│   │   ├── MetricDataController.java
│   │   └── MonitoredApplicationController.java
│   ├── dto/
│   │   ├── AuthRequest.java
│   │   ├── AuthResponse.java
│   │   ├── MetricDataRequest.java
│   │   ├── MetricDTO.java
│   │   ├── MonitoredApplicationDTO.java
│   │   └── RegisterRequest.java
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   ├── ResourceNotFoundException.java
│   │   └── UnauthorizedException.java
│   ├── filter/
│   │   └── JwtRequestFilter.java
│   ├── model/
│   │   ├── BaseEntity.java
│   │   ├── Metric.java
│   │   ├── MetricData.java
│   │   ├── MetricType.java
│   │   ├── MonitoredApplication.java
│   │   ├── Role.java
│   │   └── User.java
│   ├── repository/
│   │   ├── MetricDataRepository.java
│   │   ├── MetricRepository.java
│   │   ├── MonitoredApplicationRepository.java
│   │   └── UserRepository.java
│   ├── service/
│   │   ├── JwtUserDetailsService.java
│   │   ├── MetricDataService.java
│   │   ├── MetricService.java
│   │   ├── MonitoredApplicationService.java
│   │   └── UserService.java
│   └── util/
│       └── JwtUtil.java
├── src/main/resources/
│   ├── application.yml
│   ├── logback-spring.xml
│   └── db/migration/
│       ├── V1__initial_schema.sql
│       └── V2__add_users_and_roles.sql
├── src/main/frontend/
│   ├── index.html
│   └── script.js
├── src/test/java/com/appinsight/appinsight/
│   ├── controller/
│   │   ├── MonitoredApplicationControllerTest.java
│   ├── repository/
│   │   ├── MonitoredApplicationRepositoryTest.java
│   ├── service/
│   │   ├── MonitoredApplicationServiceTest.java
│   │   └── JwtUtilTest.java
├── .gitignore
├── Dockerfile
├── docker-compose.yml
└── pom.xml