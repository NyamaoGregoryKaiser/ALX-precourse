const { Model } = require('objection');

class Transaction extends Model {
  static get tableName() {
    return 'transactions';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'accountId', 'amount', 'currency', 'type', 'status'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        userId: { type: 'string', minLength: 1, maxLength: 255 },
        accountId: { type: 'string', minLength: 1, maxLength: 255 },
        reference: { type: 'string', minLength: 1, maxLength: 255 }, // Unique transaction reference
        externalReference: { type: 'string', minLength: 1, maxLength: 255, nullable: true }, // Reference from external gateway
        amount: { type: 'number', minimum: 0.01 },
        currency: { type: 'string', enum: ['USD', 'EUR', 'NGN'] },
        type: { type: 'string', enum: ['credit', 'debit'] },
        status: {
          type: 'string',
          enum: ['pending', 'completed', 'failed', 'reversed', 'refunded'],
          default: 'pending',
        },
        description: { type: 'string', maxLength: 500, nullable: true },
        metadata: { type: 'object', nullable: true }, // JSONB field for flexible data
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }

  static get relationMappings() {
    const User = require('./User');
    const Account = require(' ./Account');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'transactions.userId',
          to: 'users.id',
        },
      },
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: 'transactions.accountId',
          to: 'accounts.id',
        },
      },
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.id = this.id || require('uuid').v4();
    this.reference = this.reference || `TRX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
}

module.exports = Transaction;