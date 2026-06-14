```javascript
'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('adminpassword', 10);
    await queryInterface.bulkInsert('users', [{
      id: uuidv4(),
      username: 'admin',
      email: 'admin@mltoolbox.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { username: 'admin' }, {});
  },
};
```
*(Other seeders for sample datasets/models could be added.)*

**Query Optimization:**
*   **Indexes:** Added `unique: true` indexes on `username` and `email` for the `users` table to speed up lookups. Similar indexes would be added to `Dataset.name`, `Model.name`, etc.
*   **Eager Loading:** `include` option in Sequelize queries to reduce N+1 problems (e.g., fetching a dataset and its associated user in one query).
*   **Lazy Loading:** Sequelize's default for many-to-one or one-to-many.
*   **Pagination:** Implemented in controllers/services for listing entities.
*   **Caching:** Using Redis for frequently accessed static data or user-specific non-critical data.

---

### 3. Configuration & Setup

#### `package.json` (See above for backend and frontend)
Includes `dotenv`, `express`, `sequelize`, `pg`, `jsonwebtoken`, `bcryptjs`, `multer`, `winston`, `redis`, `express-rate-limit` for backend.
`react`, `react-router-dom`, `axios`, `react-toastify` for frontend.

#### Environment Configuration (`.env.example` - See above)
Separates sensitive information and environment-specific settings.

#### Docker Setup