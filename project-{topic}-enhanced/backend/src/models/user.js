```javascript
// This file is conceptual for documenting the schema and business logic related to a User.
// Actual DB interaction will be via Knex query builder in services.

/**
 * @typedef {object} User
 * @property {string} id - UUID
 * @property {string} name
 * @property {string} email - Unique email
 * @property {string} password - Hashed password
 * @property {'user'|'merchant'} type - Role of the user
 * @property {string} status - e.g., 'active', 'inactive', 'suspended'
 * @property {string} created_at - Timestamp
 * @property {string} updated_at - Timestamp
 * @property {string} merchant_id - (Optional) Foreign key if user is a merchant admin
 */

// Example business logic concepts:
const UserBusinessLogic = {
  // Method to check if user has access to a specific merchant
  canAccessMerchant: async (userId, merchantId) => {
    const user = await db('users').where({ id: userId }).first();
    if (!user) return false;

    if (user.type === 'admin') return true; // Admins can access all

    // If user is a merchant, check if the merchant_id matches
    if (user.type === 'merchant' && user.merchant_id === merchantId) {
      return true;
    }

    return false;
  },

  // Method to mark a user as suspended
  suspendUser: async (userId) => {
    // Logic to update user status, revoke tokens, notify etc.
  }
};

// In a real ORM like Sequelize or TypeORM, this would be a full model definition.
// With Knex, these are just guidelines for database interaction in services.
```