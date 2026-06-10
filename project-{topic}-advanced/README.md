backend/
├── src/
│   ├── config/             # Environment, Database, Redis configurations
│   ├── database/           # TypeORM entities, migrations, seeders
│   ├── middleware/         # Auth, Error handling, Rate limiting, Logging
│   ├── modules/            # Feature modules (auth, users, projects, tasks)
│ │   ├── auth/
│ │   │   ├── auth.controller.ts
│ │   │   ├── auth.service.ts
│ │   │   ├── auth.routes.ts
│ │   │   └── auth.dtos.ts
│ │   ├── users/
│ │   ├── projects/
│ │   └── tasks/
│   ├── shared/             # Reusable types, validators, utils
│   ├── app.ts              # Express application setup
│   ├── server.ts           # Server bootstrap
│   └── types/              # Global type definitions
├── tests/                  # Unit, Integration, API tests
├── .env.example
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md