```javascript
const allRoles = {
  viewer: [],
  editor: ['getUsers', 'manageUsers', 'getPosts', 'managePosts', 'getCategories', 'manageCategories'],
  admin: ['getUsers', 'manageUsers', 'getPosts', 'managePosts', 'getCategories', 'manageCategories'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
```