const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WebhookEndpoint extends Model {
    static associate(models) {
      WebhookEndpoint.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
      WebhookEndpoint.hasMany(models.WebhookEvent, { foreignKey: 'endpointId', as: 'events' });
    }
  }

  WebhookEndpoint.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isUrl: true,
        },
      },
      events: {
        type: DataTypes.ARRAY(DataTypes.STRING), // e.g., ['transaction.created', 'transaction.status_updated']
        allowNull: false,
      },
      secret: {
        type: DataTypes.STRING, // Used for signing webhooks for security
        allowNull: true, // Can be null if no signing needed
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastTriggeredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'WebhookEndpoint',
      tableName: 'webhook_endpoints',
    }
  );

  return WebhookEndpoint;
};