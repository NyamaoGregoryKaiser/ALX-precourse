const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WebhookEvent extends Model {
    static associate(models) {
      WebhookEvent.belongsTo(models.WebhookEndpoint, { foreignKey: 'endpointId', as: 'endpoint' });
    }
  }

  WebhookEvent.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      endpointId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'webhook_endpoints',
          key: 'id',
        },
      },
      eventType: {
        type: DataTypes.STRING, // e.g., 'transaction.status_updated'
        allowNull: false,
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'sent', 'failed', 'retrying'),
        defaultValue: 'pending',
        allowNull: false,
      },
      attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      lastAttemptAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      nextAttemptAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      responseStatusCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      responseBody: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'WebhookEvent',
      tableName: 'webhook_events',
      indexes: [
        {
          fields: ['endpointId', 'status'],
        },
        {
          fields: ['eventType'],
        },
      ],
    }
  );

  return WebhookEvent;
};