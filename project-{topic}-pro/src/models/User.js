const { Model } = require('objection');
const bcrypt = require('bcryptjs');

class User extends Model {
  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        email: { type: 'string', minLength: 5, maxLength: 255 },
        password: { type: 'string', minLength: 6, maxLength: 255 },
        firstName: { type: 'string', minLength: 1, maxLength: 255 },
        lastName: { type: 'string', minLength: 1, maxLength: 255 },
        role: { type: 'string', enum: ['user', 'admin'], default: 'user' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }

  // Define relationships
  static get relationMappings() {
    const Account = require('./Account');
    const PaymentMethod = require('./PaymentMethod');
    return {
      accounts: {
        relation: Model.HasManyRelation,
        modelClass: Account,
        join: {
          from: 'users.id',
          to: 'accounts.userId',
        },
      },
      paymentMethods: {
        relation: Model.HasManyRelation,
        modelClass: PaymentMethod,
        join: {
          from: 'users.id',
          to: 'payment_methods.userId',
        },
      },
    };
  }

  // Helper method to hash password before insert/update
  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.password = await bcrypt.hash(this.password, 10);
    this.id = this.id || require('uuid').v4(); // Generate UUID if not provided
  }

  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    if (this.password && this.password.length < 60) { // Check if password is not already hashed
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  // Method to validate password
  async validatePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Sanitize user object for public view
  static get hidden() {
    return ['password'];
  }

  toJSON() {
    const json = super.toJSON();
    User.hidden.forEach(prop => delete json[prop]);
    return json;
  }
}

module.exports = User;