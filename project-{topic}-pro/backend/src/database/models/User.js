const db = require('../connection');
const bcrypt = require('bcryptjs');

class User {
  static async create({ username, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db('users').insert({
      username,
      email,
      password: hashedPassword,
    }).returning(['id', 'username', 'email', 'created_at', 'updated_at']);
    return user;
  }

  static async findByUsername(username) {
    return db('users').where({ username }).first();
  }

  static async findById(id) {
    return db('users').where({ id }).first();
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  // You can add more methods here, e.g., update, delete
}

module.exports = User;