.
├── CMakeLists.txt
├── docker-compose.yml
├── Dockerfile
├── .gitignore
├── .github
│   └── workflows
│       └── ci.yml
├── config
│   └── app_config.json
├── database
│   ├── schema.sql
│   └── seed.sql
├── docs
│   ├── README.md
│   ├── api.md
│   ├── architecture.md
│   └── deployment.md
├── src
│   ├── main.cc
│   ├── controllers
│   │   ├── AuthController.h
│   │   ├── AuthController.cc
│   │   ├── ProductController.h
│   │   ├── ProductController.cc
│   │   ├── OrderController.h
│   │   ├── OrderController.cc
│   │   └── UserController.h
│   │   └── UserController.cc
│   ├── middleware
│   │   ├── AuthMiddleware.h
│   │   ├── AuthMiddleware.cc
│   │   ├── ErrorHandler.h
│   │   └── ErrorHandler.cc
│   ├── models
│   │   ├── User.h
│   │   ├── Product.h
│   │   └── Order.h
│   ├── repositories
│   │   ├── UserRepository.h
│   │   ├── UserRepository.cc
│   │   ├── ProductRepository.h
│   │   ├── ProductRepository.cc
│   │   ├── OrderRepository.h
│   │   └── OrderRepository.cc
│   ├── services
│   │   ├── AuthService.h
│   │   ├── AuthService.cc
│   │   ├── UserService.h
│   │   ├── UserService.cc
│   │   ├── ProductService.h
│   │   ├── ProductService.cc
│   │   ├── OrderService.h
│   │   └── OrderService.cc
│   └── utils
│       ├── AppConfig.h
│       ├── AppConfig.cc
│       ├── CryptoUtils.h
│       ├── CryptoUtils.cc
│       ├── JwtManager.h
│       ├── JwtManager.cc
│       ├── RedisManager.h
│       └── RedisManager.cc
└── tests
    ├── CMakeLists.txt
    ├── unit
    │   ├── test_AppConfig.cc
    │   ├── test_CryptoUtils.cc
    │   └── test_JwtManager.cc
    └── integration
        └── test_UserRepository.cc