backend/
├── src/
│   ├── config/             # Environment variables, constants
│   ├── controllers/        # Handle HTTP requests, call services
│   ├── database/           # Knex instance, setup
│   ├── middleware/         # Auth, error handling, logging, rate limiting
│   ├── models/             # Database interactions (Knex queries)
│   ├── routes/             # Define API endpoints
│   ├── services/           # Business logic, interact with models
│   ├── utils/              # Helper functions (validators, jwt, etc.)
│   ├── validators/         # Joi schemas for input validation
│   ├── app.js              # Express app setup, middleware, routes
│   └── server.js           # Entry point, starts the server
├── database/               # Knex migrations and seeds
│   ├── migrations/
│   └── seeds/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── api/
├── .env.example
├── Dockerfile
├── knexfile.js
├── package.json
└── README.md