const { Model } = require('objection');

class PaymentMethod extends Model {
  static get tableName() {
    return 'payment_methods';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'type', 'externalId', 'last4', 'expiryMonth', 'expiryYear'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        userId: { type: 'string', minLength: 1, maxLength: 255 },
        type: { type: 'string', enum: ['card', 'bank_account'] }, // e.g., 'card', 'bank_account', 'mobile_money'
        externalId: { type: 'string', minLength: 1, maxLength: 255 }, // ID from payment gateway
        last4: { type: 'string', minLength: 4, maxLength: 4, nullable: true }, // Last 4 digits of card/account
        brand: { type: 'string', maxLength: 50, nullable: true }, // e.g., 'Visa', 'Mastercard'
        expiryMonth: { type: 'integer', minimum: 1, maximum: 12, nullable: true },
        expiryYear: { type: 'integer', minimum: 2000, maximum: 2100, nullable: true },
        fingerprint: { type: 'string', maxLength: 255, nullable: true }, // For identifying unique cards
        isDefault: { type: 'boolean', default: false },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }

  static get relationMappings() {
    const User = require('./User');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'payment_methods.userId',
          to: 'users.id',
        },
      },
    };
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.id = this.id || require('uuid').v4();
  }
}

module.exports = PaymentMethod;