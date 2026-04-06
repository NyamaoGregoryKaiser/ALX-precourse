.
├── .github/
│   └── workflows/
│       └── ci.yml             # CI/CD pipeline
├── client/                     # Frontend React application
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── components/
│   │   │   ├── AuthForm.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── TransactionList.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── AccountPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── auth.service.ts
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── src/                        # Backend Node.js application
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Entry point
│   ├── config/
│   │   ├── index.ts            # Environment variables
│   │   └── jwt.ts              # JWT configuration
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # JWT authentication middleware
│   │   ├── error.middleware.ts # Centralized error handling
│   │   └── rateLimit.middleware.ts # API rate limiting
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.validation.ts
│   │   ├── accounts/
│   │   │   ├── account.controller.ts
│   │   │   ├── account.service.ts
│   │   │   └── account.routes.ts
│   │   ├── transactions/
│   │   │   ├── transaction.controller.ts
│   │   │   ├── transaction.service.ts
│   │   │   └── transaction.routes.ts
│   │   ├── payments/           # Handles internal transfers
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── payment.routes.ts
│   │   │   └── payment.validation.ts
│   │   └── webhooks/           # Placeholder for external integrations
│   │       ├── webhook.controller.ts
│   │       ├── webhook.service.ts
│   │       └── webhook.routes.ts
│   ├── routes/
│   │   └── index.ts            # Aggregates all module routes
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Seed script
│   ├── utils/
│   │   ├── logger.ts           # Winston logger setup
│   │   ├── asyncHandler.ts     # Utility for async route handlers
│   │   ├── apiError.ts         # Custom error classes
│   │   └── prisma.ts           # Prisma client instance
│   └── types/
│       ├── express.d.ts        # Custom Express request types
│       └── index.d.ts          # Global types
├── tests/
│   ├── unit/
│   │   └── services/
│   │       ├── userService.test.ts
│   │       └── transactionService.test.ts
│   ├── integration/
│   │   └── api/
│   │       ├── auth.test.ts
│   │       └── transactions.test.ts
├── .env.example                # Environment variables template
├── ARCHITECTURE.md             # Architecture documentation
├── API.md                      # API documentation
├── Dockerfile                  # Backend Dockerfile
├── docker-compose.yml          # Docker Compose setup
├── jest.config.ts              # Jest configuration
├── package.json                # Backend dependencies
├── README.md                   # Project README
├── tsconfig.json               # Backend TypeScript configuration