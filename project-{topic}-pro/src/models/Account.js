const { Model } = require('objection');

class Account extends Model {
  static get tableName() {
    return 'accounts';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'accountNumber', 'balance', 'currency'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        userId: { type: 'string', minLength: 1, maxLength: 255 },
        accountNumber: { type: 'string', minLength: 5, maxLength: 255 },
        balance: { type: 'number', minimum: 0, default: 0 },
        currency: { type: 'string', enum: ['USD', 'EUR', 'NGN'], default: 'NGN' },
        status: { type: 'string', enum: ['active', 'inactive', 'suspended'], default: 'active' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }

  static get relationMappings() {
    const User = require('./User');
    const Transaction = require('./Transaction');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'accounts.userId',
          to: 'users.id',
        },
      },
      transactions: {
        relation: Model.HasManyRelation,
        modelClass: Transaction,
        join: {
          from: 'accounts.id',
          to: 'transactions.accountId',
        },
      },
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.id = this.id || require('uuid').v4();
  }
}

module.exports = Account;