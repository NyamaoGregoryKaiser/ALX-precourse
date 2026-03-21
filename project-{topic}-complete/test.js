payment_processor/
├── src/
│   ├── main.cpp
│   ├── models/
│   │   ├── User.h
│   │   ├── Account.h
│   │   ├── Transaction.h
│   │   └── DTOs.h
│   ├── database/
│   │   ├── DatabaseManager.h
│   │   └── DatabaseManager.cpp
│   ├── services/
│   │   ├── AuthService.h
│   │   ├── AuthService.cpp
│   │   ├── AccountService.h
│   │   ├── AccountService.cpp
│   │   ├── TransactionService.h
│   │   └── TransactionService.cpp
│   ├── controllers/
│   │   ├── AuthController.h
│   │   ├── AuthController.cpp
│   │   ├── AccountController.h
│   │   ├── AccountController.cpp
│   │   ├── TransactionController.h
│   │   └── TransactionController.cpp
│   ├── middleware/
│   │   ├── AuthMiddleware.h
│   │   └── ErrorHandlerMiddleware.h
│   ├── utils/
│   │   ├── Hasher.h
│   │   ├── JwtManager.h
│   │   └── Logger.h
│   ├── config/
│   │   └── AppConfig.h
│   └── exceptions/
│       └── CustomExceptions.h
├── tests/
├── migrations/
├── seed_data/
├── config/
├── docker/
├── .github/
├── docs/
├── CMakeLists.txt
└── .gitignore