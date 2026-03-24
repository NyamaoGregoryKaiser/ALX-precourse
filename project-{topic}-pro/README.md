backend/
├── src/
│   ├── main.ts                   # Application entry point
│   ├── app.module.ts             # Root application module
│   ├── config/                   # Environment configuration and validation
│   ├── common/                   # Shared filters, interceptors, guards, decorators
│   ├── auth/                     # Authentication (JWT)
│   ├── users/                    # User management
│   ├── projects/                 # Project management
│   ├── tasks/                    # Task management
│   ├── comments/                 # Comment management
│   ├── notifications/            # Notification system
│   ├── database/                 # TypeORM migrations and seeds
│   ├── logging/                  # Winston logger setup
│   └── ...                       # Other modules
├── test/                         # E2E tests
├── ormconfig.js                  # TypeORM configuration for migrations
├── package.json
├── tsconfig.json
└── .env.example