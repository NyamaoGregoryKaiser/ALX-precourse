alxpay-system/
├── backend/
│   ├── src/
│   │   ├── config/              # Environment variables, database config
│   │   ├── controllers/         # Handles incoming requests, orchestrates services
│   │   ├── entities/            # TypeORM entities (database schemas)
│   │   ├── middlewares/         # Authentication, error handling, rate limiting, caching
│   │   ├── repositories/        # TypeORM custom repositories (data access)
│   │   ├── services/            # Business logic, interacts with repositories
│   │   ├── utils/               # Helpers, token generation, logging
│   │   ├── types/               # TypeScript custom types/interfaces
│   │   ├── routes/              # API route definitions
│   │   ├── subscribers/         # TypeORM event subscribers (e.g., for webhooks)
│   │   ├── app.ts               # Express application setup
│   │   └── server.ts            # Entry point, starts the server
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── api/
│   ├── .env.example
│   ├── .eslintrc.js
│   ├── jest.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Top-level page components
│   │   ├── services/            # API interaction logic
│   │   ├── context/             # React context for global state
│   │   ├── hooks/               # Custom React hooks
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── react-app-env.d.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── README.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── main.yml             # CI/CD pipeline
├── loadtest/
│   └── k6_script.js             # Performance testing script
└── seed.ts                      # Database seed script