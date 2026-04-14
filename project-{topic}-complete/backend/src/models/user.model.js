```javascript
const db = require('../db');
const bcrypt = require('bcryptjs');

class User {
    static table = 'users';

    static async create(username, email, password, role = 'user') {
        const passwordHash = await bcrypt.hash(password, 10);
        const [user] = await db(User.table).insert({
            username,
            email,
            password_hash: passwordHash,
            role,
        }, ['id', 'username', 'email', 'role']);
        return user;
    }

    static async findById(id) {
        return db(User.table).select('id', 'username', 'email', 'role', 'created_at', 'updated_at').where({ id }).first();
    }

    static async findByEmail(email) {
        return db(User.table).select('id', 'username', 'email', 'role', 'password_hash').where({ email }).first();
    }

    static async update(id, data) {
        if (data.password) {
            data.password_hash = await bcrypt.hash(data.password, 10);
            delete data.password;
        }
        await db(User.table).where({ id }).update({ ...data, updated_at: db.fn.now() });
        return this.findById(id);
    }

    static async delete(id) {
        return db(User.table).where({ id }).del();
    }

    static async comparePassword(candidatePassword, userPasswordHash) {
        return bcrypt.compare(candidatePassword, userPasswordHash);
    }
}

module.exports = User;
```