.
├── .github/                       # CI/CD workflows
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── src/
│   │   ├── config/                # Environment variables, DB config
│   │   ├── database/              # TypeORM entities, migrations, data-source.ts
│   │   ├── middleware/            # Auth, error handling, logging, rate limiting
│   │   ├── modules/               # Core application logic (users, dashboards, data-sources, charts)
│   │   │   ├── auth/
│   │   │   ├── charts/
│   │   │   ├── dashboards/
│   │   │   ├── data-sources/
│   │   │   └── users/
│   │   ├── services/              # External integrations (e.g., DataQueryService)
│   │   ├── utils/                 # Utility functions (logger, jwt, etc.)
│   │   └── app.ts                 # Express application setup
│   │   └── server.ts              # Server entry point
│   ├── tests/                     # Backend tests
│   │   ├── integration/
│   │   └── unit/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── ormconfig.ts
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                   # API service calls
│   │   ├── assets/
│   │   ├── components/            # Reusable UI components
│   │   ├── context/               # React Context API for global state
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── pages/                 # Main application pages
│   │   ├── types/                 # TypeScript types
│   │   ├── utils/
│   │   └── App.tsx                # Main React component
│   │   └── index.tsx              # React entry point
│   ├── tests/                     # Frontend tests
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml             # Docker orchestration
├── .gitignore
├── API.md                         # API Documentation
├── ARCHITECTURE.md                # Architecture Documentation
├── DEPLOYMENT.md                  # Deployment Guide
└── README.md                      # Project README