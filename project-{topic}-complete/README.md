chat-app/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   ├── validators/
│   │   ├── config/
│   │   ├── database/
│   │   │   ├── entities/
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── data-source.ts
│   │   ├── middlewares/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── api/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── ormconfig.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── chat/
│   │   │   └── auth/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── main.tsx
│   ├── tests/
│   │   ├── unit/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── nginx.conf
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── cd.yml
├── README.md
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── API_DOCS.md