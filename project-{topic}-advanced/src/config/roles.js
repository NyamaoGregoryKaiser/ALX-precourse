```javascript
// src/config/roles.js
const allRoles = {
    user: [],
    admin: ['getUsers', 'manageUsers', 'getMerchants', 'manageMerchants', 'getTransactions'],
    // merchant: ['getTransactions', 'manageTransactions'] // This role is handled by apiKeyAuth
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
    roles,
    roleRights,
};
```