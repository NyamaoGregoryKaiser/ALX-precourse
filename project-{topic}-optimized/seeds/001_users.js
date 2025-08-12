```javascript
// seeds/001_users.js
exports.seed = function(knex) {
  return knex('users').insert([
    {username: 'admin', password: 'password'}, // **Insecure, replace with proper hashing!**
  ]);
};
```