graph TD
    User -->|HTTP/HTTPS| Frontend(React App)
    User -->|WS/WSS| Frontend

    Frontend -->|REST API Calls (Axios)| Backend(Node.js/Express App)
    Frontend -->|WebSocket (Socket.IO-client)| Backend

    Backend -->|ORM (Prisma)| PostgreSQL(Database)
    Backend -->|Cache (ioredis)| Redis(Cache/Pub-Sub)

    PostgreSQL -- Migrations & Data --> Prisma(Prisma Client)
    Redis -- Cache / Pub-Sub --> Backend

    SubGraph Development & Deployment
        Developer -->|Code| GitHub(Code Repository)
        GitHub -->|Push| CI/CD(GitHub Actions)
        CI/CD -->|Build & Test| Docker(Docker Images)
        Docker -->|Deploy (e.g., Kubernetes, EC2)| CloudPlatform
    End