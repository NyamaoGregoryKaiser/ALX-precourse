ml-utilities-system/
├── .github/
│   └── workflows/
│       └── main.yml
├── docker-compose.yml
├── Dockerfile
├── pom.xml
├── README.md
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── ml/
│   │   │           └── utilities/
│   │   │               └── system/
│   │   │                   ├── MlUtilitiesSystemApplication.java
│   │   │                   ├── config/
│   │   │                   │   ├── CacheConfig.java
│   │   │                   │   ├── OpenApiConfig.java
│   │   │                   │   ├── RateLimitFilter.java
│   │   │                   │   └── SecurityConfig.java
│   │   │                   ├── controller/
│   │   │                   │   ├── AuthController.java
│   │   │                   │   ├── DatasetController.java
│   │   │                   │   ├── ExperimentController.java
│   │   │                   │   ├── FeatureSetController.java
│   │   │                   │   └── ModelController.java
│   │   │                   ├── dto/
│   │   │                   │   ├── AuthRequest.java
│   │   │                   │   ├── AuthResponse.java
│   │   │                   │   ├── DatasetDTO.java
│   │   │                   │   ├── ExperimentDTO.java
│   │   │                   │   ├── FeatureSetDTO.java
│   │   │                   │   ├── ModelDTO.java
│   │   │                   │   └── UserDTO.java
│   │   │                   ├── exception/
│   │   │                   │   ├── GlobalExceptionHandler.java
│   │   │                   │   ├── InvalidCredentialsException.java
│   │   │                   │   ├── RateLimitExceededException.java
│   │   │                   │   ├── ResourceNotFoundException.java
│   │   │                   │   └── UserAlreadyExistsException.java
│   │   │                   ├── model/
│   │   │                   │   ├── Dataset.java
│   │   │                   │   ├── Experiment.java
│   │   │                   │   ├── FeatureSet.java
│   │   │                   │   ├── Model.java
│   │   │                   │   ├── Role.java
│   │   │                   │   └── User.java
│   │   │                   ├── repository/
│   │   │                   │   ├── DatasetRepository.java
│   │   │                   │   ├── ExperimentRepository.java
│   │   │                   │   ├── FeatureSetRepository.java
│   │   │                   │   ├── ModelRepository.java
│   │   │                   │   └── UserRepository.java
│   │   │                   ├── security/
│   │   │                   │   ├── CustomUserDetailsService.java
│   │   │                   │   ├── JwtAuthFilter.java
│   │   │                   │   ├── JwtAuthenticationEntryPoint.java
│   │   │                   │   └── JwtService.java
│   │   │                   ├── service/
│   │   │                   │   ├── AuthService.java
│   │   │                   │   ├── DatasetService.java
│   │   │                   │   ├── ExperimentService.java
│   │   │                   │   ├── FeatureSetService.java
│   │   │                   │   └── ModelService.java
│   │   │                   └── util/
│   │   │                       └── MapperUtil.java
│   │   │
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── logback-spring.xml
│   │       └── db/
│   │           └── migration/
│   │               ├── V1__Initial_schema.sql
│   │               └── V2__Seed_data.sql
│   │
│   └── test/
│       └── java/
│           └── com/
│               └── ml/
│                   └── utilities/
│                       └── system/
│                           ├── controller/
│                           │   ├── AuthControllerTest.java
│                           │   ├── DatasetControllerIntegrationTest.java
│                           │   ├── ExperimentControllerIntegrationTest.java
│                           │   ├── FeatureSetControllerIntegrationTest.java
│                           │   └── ModelControllerIntegrationTest.java
│                           ├── repository/
│                           │   ├── DatasetRepositoryTest.java
│                           │   ├── ExperimentRepositoryTest.java
│                           │   ├── FeatureSetRepositoryTest.java
│                           │   ├── ModelRepositoryTest.java
│                           │   └── UserRepositoryTest.java
│                           └── service/
│                               ├── AuthServiceTest.java
│                               ├── DatasetServiceTest.java
│                               ├── ExperimentServiceTest.java
│                               ├── FeatureSetServiceTest.java
│                               └── ModelServiceTest.java
├── static/
│   ├── index.html
│   └── script.js