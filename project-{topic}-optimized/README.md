.
├── .github/                       # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── main.yml
├── backend/                       # NestJS Backend Application
│   ├── .env.example
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   ├── common/                # Shared utilities, filters, interceptors
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── cache.interceptor.ts
│   │   │   │   └── logging.interceptor.ts
│   │   │   └── pipes/
│   │   │       └── validation.pipe.ts
│   │   ├── config/                # Environment configuration
│   │   │   ├── configuration.ts
│   │   │   └── validation.schema.ts
│   │   ├── database/              # Database utilities and seeds
│   │   │   └── seeds/
│   │   │       └── initial.seed.ts
│   │   ├── auth/                  # Authentication & Authorization module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── decorators/
│   │   │   │   └── roles.decorator.ts
│   │   │   └── dto/
│   │   │       ├── login-user.dto.ts
│   │   │       └── register-user.dto.ts
│   │   ├── users/                 # User management module
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   ├── projects/              # Project management module
│   │   │   ├── projects.module.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── projects.controller.ts
│   │   │   ├── entities/
│   │   │   │   └── project.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-project.dto.ts
│   │   │       └── update-project.dto.ts
│   │   ├── tasks/                 # Task management module
│   │   │   ├── tasks.module.ts
│   │   │   ├── tasks.service.ts
│   │   │   ├── tasks.controller.ts
│   │   │   ├── entities/
│   │   │   │   └── task.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-task.dto.ts
│   │   │   │   └── update-task.dto.ts
│   │   │   └── enums/
│   │   │       └── task-status.enum.ts
│   │   ├── migrations/            # TypeORM migration scripts
│   │   │   └── 1678888888888-InitialSchema.ts
│   │   └── utils/
│   │       └── logger.ts          # Custom logger using Winston
│   └── test/                      # Backend tests
│       ├── app.e2e-spec.ts
│       └── jest-e2e.json
├── frontend/                      # React Frontend Application
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                   # API client configuration
│   │   │   └── api.ts
│   │   ├── assets/                # Static assets
│   │   ├── components/            # Reusable UI components
│   │   │   ├── AuthForm.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   └── TaskCard.tsx
│   │   ├── context/               # React Context APIs
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/                 # Custom React hooks
│   │   │   └── useAuth.ts
│   │   ├── pages/                 # Page-level components
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ProjectDetailPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── styles/                # Global styles and theme
│   │   │   └── theme.ts
│   │   └── types/                 # Shared TypeScript types
│   │       └── index.ts
│   └── tests/                     # Frontend tests
│       └── components/
│           └── Header.test.tsx
├── Dockerfile                     # Base Dockerfile for backend
├── Dockerfile.frontend            # Dockerfile for frontend
├── docker-compose.yml             # Docker Compose orchestration
├── API_DOCUMENTATION.md
├── ARCHITECTURE.md
└── DEPLOYMENT_GUIDE.md