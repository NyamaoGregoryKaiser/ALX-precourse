.
├── backend/
│   ├── src/
│   │   ├── config/              # Environment variables, database, redis configs
│   │   ├── controllers/         # Express route handlers
│   │   ├── entities/            # TypeORM entities (database models)
│   │   ├── middleware/          # Express middleware (auth, error, rate limit, validation)
│   │   ├── migrations/          # TypeORM database migration scripts
│   │   ├── services/            # Business logic layer
│   │   ├── utils/               # Helper utilities (logger, prometheus client)
│   │   ├── app.ts               # Express application setup
│   │   ├── data-source.ts       # TypeORM data source configuration
│   │   ├── index.ts             # Server entry point
│   │   └── types.d.ts           # Custom TypeScript type definitions
│   ├── tests/                   # Unit and integration tests
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── ormconfig.ts             # TypeORM config for migrations CLI
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                 # Axios API clients
│   │   ├── components/          # Reusable React components
│   │   ├── context/             # React Context for global state (e.g., Auth)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Top-level React page components
│   │   ├── utils/               # Frontend utilities
│   │   ├── App.tsx              # Main React application component
│   │   ├── index.tsx            # React entry point
│   │   └── react-app-env.d.ts
│   ├── tests/                   # Frontend unit tests
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml           # Docker setup for all services
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD pipeline
├── k6/
│   └── performance-test.js      # K6 script for API performance testing
├── README.md                    # Comprehensive setup and usage instructions
├── architecture.md              # System architecture documentation
├── api-docs.md                  # API documentation
├── deployment.md                # Deployment guide
└── .gitignore