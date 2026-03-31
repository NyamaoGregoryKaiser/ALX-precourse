├── .github/workflows/maven.yml
├── Dockerfile
├── docker-compose.yml
├── pom.xml
├── README.md
├── src
│   ├── main
│   │   ├── java
│   │   │   └── com
│   │   │       └── ml_utils_system
│   │   │           ├── MlUtilsSystemApplication.java
│   │   │           ├── config
│   │   │           │   ├── AppConfig.java
│   │   │           │   ├── CacheConfig.java
│   │   │           │   ├── FlywayConfig.java
│   │   │           │   ├── JwtAuthEntryPoint.java
│   │   │           │   ├── JwtAuthTokenFilter.java
│   │   │           │   ├── JwtUtils.java
│   │   │           │   ├── SecurityConfig.java
│   │   │           │   └── WebConfig.java
│   │   │           ├── controller
│   │   │           │   ├── AuthController.java
│   │   │           │   ├── DatasetController.java
│   │   │           │   ├── FeatureDefinitionController.java
│   │   │           │   ├── ModelController.java
│   │   │           │   └── UserController.java
│   │   │           ├── dto
│   │   │           │   ├── AuthResponseDto.java
│   │   │           │   ├── DatasetDto.java
│   │   │           │   ├── FeatureDefinitionDto.java
│   │   │           │   ├── LoginRequestDto.java
│   │   │           │   ├── ModelDto.java
│   │   │           │   ├── ModelVersionDto.java
│   │   │           │   ├── PredictionRequestDto.java
│   │   │           │   ├── PredictionResponseDto.java
│   │   │           │   ├── RegisterRequestDto.java
│   │   │           │   └── UserDto.java
│   │   │           ├── exception
│   │   │           │   ├── GlobalExceptionHandler.java
│   │   │           │   ├── ResourceNotFoundException.java
│   │   │           │   └── ValidationException.java
│   │   │           ├── filter
│   │   │           │   └── RateLimitFilter.java
│   │   │           ├── model
│   │   │           │   ├── Dataset.java
│   │   │           │   ├── FeatureDefinition.java
│   │   │           │   ├── Model.java
│   │   │           │   ├── ModelVersion.java
│   │   │           │   ├── Role.java
│   │   │           │   └── User.java
│   │   │           ├── repository
│   │   │           │   ├── DatasetRepository.java
│   │   │           │   ├── FeatureDefinitionRepository.java
│   │   │           │   ├── ModelRepository.java
│   │   │           │   ├── ModelVersionRepository.java
│   │   │           │   ├── RoleRepository.java
│   │   │           │   └── UserRepository.java
│   │   │           ├── service
│   │   │           │   ├── AuthService.java
│   │   │           │   ├── DatasetService.java
│   │   │           │   ├── FeatureDefinitionService.java
│   │   │           │   ├── ModelService.java
│   │   │           │   ├── PredictionService.java
│   │   │           │   ├── UserDetailsServiceImpl.java
│   │   │           │   └── UserService.java
│   │   │           └── util
│   │   │               └── CustomLogger.java
│   │   └── resources
│   │       ├── application.yml
│   │       ├── db
│   │       │   └── migration
│   │       │       ├── V1__Initial_schema.sql
│   │       │       ├── V2__Add_sample_data.sql
│   │       │       └── V3__Add_feature_table.sql
│   │       └── logback-spring.xml
│   └── test
│       └── java
│           └── com
│               └── ml_utils_system
│                   ├── MlUtilsSystemApplicationTests.java
│                   ├── config
│                   │   └── TestSecurityConfig.java
│                   ├── controller
│                   │   ├── AuthControllerTest.java
│                   │   ├── DatasetControllerTest.java
│                   │   └── ModelControllerTest.java
│                   ├── repository
│                   │   ├── DatasetRepositoryTest.java
│                   │   └── UserRepositoryTest.java
│                   └── service
│                       ├── AuthServiceTest.java
│                       └── DatasetServiceTest.java
└── frontend
    ├── README.md
    ├── package.json
    ├── public/index.html
    └── src
        ├── App.js
        ├── api.js
        ├── auth.js
        ├── components
        │   ├── Datasets.js
        │   ├── Features.js
        │   ├── Home.js
        │   ├── Login.js
        │   ├── Models.js
        │   ├── Navbar.js
        │   └── Register.js
        ├── index.js
        └── style.css