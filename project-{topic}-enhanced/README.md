.
├── src/
│   ├── app.ts                 # Express app setup, middleware, routes, Swagger
│   ├── server.ts              # Server startup, DB/Redis connection, BullMQ worker
│   ├── config/
│   │   ├── index.ts           # Environment configuration loader
│   │   ├── database.ts        # TypeORM DataSource initialization
│   │   └── redis.ts           # Redis client initialization
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 1678886400000-InitialSchema.ts # Initial database schema
│   │   ├── entities/
│   │   │   ├── User.ts
│   │   │   ├── Project.ts
│   │   │   ├── Metric.ts
│   │   │   ├── AlertRule.ts
│   │   │   └── Alert.ts
│   │   └── seed.ts            # Script to populate initial data
│   ├── middleware/
│   │   ├── auth.ts            # Authentication & Authorization middleware
│   │   ├── error.ts           # Custom error classes and global error handler
│   │   └── rateLimiter.ts     # API rate limiting middleware
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.routes.ts
│   │   ├── projects/
│   │   │   ├── project.controller.ts
│   │   │   ├── project.service.ts
│   │   │   └── project.routes.ts
│   │   ├── metrics/
│   │   │   ├── metric.controller.ts
│   │   │   ├── metric.service.ts
│   │   │   ├── metric.routes.ts
│   │   │   └── alert.processor.ts # Logic for alert evaluation (BullMQ worker)
│   │   ├── alerts/
│   │   │   ├── alert.controller.ts
│   │   │   ├── alert.service.ts
│   │   │   └── alert.routes.ts
│   │   └── index.ts           # Barrel file for modules (optional, for cleaner imports)
│   ├── utils/
│   │   ├── logger.ts          # Winston logger setup
│   │   ├── jwt.ts             # JWT token utilities
│   │   ├── hash.ts            # Password hashing utilities
│   │   └── catchAsync.ts      # Async error wrapper for Express routes
│   └── types/
│       └── express.d.ts       # Custom Express Request type definitions
├── tests/
│   ├── unit/
│   │   ├── auth.service.test.ts
│   │   └── user.service.test.ts
│   ├── integration/
│   │   └── auth.api.test.ts
│   └── setup.ts               # Jest setup file for test environment
├── frontend/                  # Minimal conceptual React application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── components/
│   │       └── Dashboard.tsx
│   └── package.json
├── .env.example               # Example environment variables
├── Dockerfile                 # Docker build instructions for the backend
├── docker-compose.yml         # Docker Compose for dev environment (app, db, redis)
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.ts             # Jest configuration
├── ormconfig.ts               # TypeORM CLI configuration
├── README.md                  # Comprehensive project README
├── ARCHITECTURE.md            # System architecture documentation
├── API_DOCS.md                # Detailed API documentation
├── DEPLOYMENT.md              # Deployment guide
└── .github/
    └── workflows/
        └── ci.yml             # GitHub Actions CI/CD pipeline configuration