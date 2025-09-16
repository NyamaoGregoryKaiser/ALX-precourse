```javascript
// seeds/001_users.js
exports.seed = function(knex) {
  return knex('users').insert([
    { username: 'admin', password: 'password123' }, //Insecure - replace with bcrypt hashing in production
  ]);
};
```