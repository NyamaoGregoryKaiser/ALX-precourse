```javascript
// src/models/webhookEvent.model.js
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const paginate = require('./plugins/paginate.plugin');
const toJSON = require('./plugins/toJSON.plugin');

module.exports = (sequelize) => {
    const WebhookEvent = sequelize.define('WebhookEvent', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
        },
        webhookConfigId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'webhook_configs',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        eventType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        payload: {
            type: DataTypes.JSONB, // The full payload sent to the webhook URL
            allowNull: false,
        },
        responseStatusCode: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        responseBody: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        success: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        attemptCount: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
        },
        lastAttemptedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        nextAttemptAt: {
            type: DataTypes.DATE,
            allowNull: true, // For retry scheduling
        },
    }, {
        timestamps: true, // createdAt for first dispatch, updatedAt for retries
        tableName: 'webhook_events',
        indexes: [
            { fields: ['webhookConfigId'] },
            { fields: ['eventType'] },
            { fields: ['success'] },
            { fields: ['nextAttemptAt'] },
        ]
    });

    WebhookEvent.paginate = paginate;
    WebhookEvent.toJSON = toJSON;

    WebhookEvent.associate = (models) => {
        WebhookEvent.belongsTo(models.WebhookConfig, { foreignKey: 'webhookConfigId', as: 'webhookConfig' });
    };

    return WebhookEvent;
};
```