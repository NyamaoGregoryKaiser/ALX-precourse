.
├── .github/
│   └── workflows/
│       └── ci.yml
├── client/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── entities/
│   │   ├── interfaces/
│   │   ├── middlewares/
│   │   ├── migrations/
│   │   ├── modules/
│   │   ├── subscribers/
│   │   ├── utils/
│   │   └── tests/
│   ├── package.json
│   ├── tsconfig.json
│   └── ormconfig.ts
├── .dockerignore
├── .env.example
├── docker-compose.yml
├── README.md
└── package.json (root for lerna/yarn workspaces, or just scripts)