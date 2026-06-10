```typescript
import Joi from 'joi';
import { UserRole } from '../../database/entities/User';

export const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.')
    .optional(),
  role: Joi.string().valid(...Object.values(UserRole)).optional(), // Role update should be restricted by authorization
}).min(1); // At least one field is required for update

export const userIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
```

### 1. Core Application (Frontend - React/TypeScript)

#### Frontend Structure

```
frontend/
├── public/
├── src/
│   ├── api/            # Axios instance and API calls
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React Context for authentication
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Top-level page components (Login, Dashboard, Projects)
│   ├── types/          # Frontend-specific type definitions
│   ├── App.tsx         # Main application component
│   ├── index.tsx       # Entry point
│   └── vite-env.d.ts
├── .env.example
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

#### File Implementations (Frontend)