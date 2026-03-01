```javascript
// src/models/webhookConfig.model.js
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const paginate = require('./plugins/paginate.plugin');
const toJSON = require('./plugins/toJSON.plugin');

module.exports = (sequelize) => {
    const WebhookConfig = sequelize.define('WebhookConfig', {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv4(),
            primaryKey: true,
            allowNull: false,
        },
        merchantId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'merchants', // refers to table name
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        url: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isUrl: true, // Ensure it's a valid URL
            },
        },
        secret: {
            type: DataTypes.STRING, // Secret key to sign webhook payloads
            allowNull: false,
            private: true, // Do not expose in API responses
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        events: {
            type: DataTypes.ARRAY(DataTypes.STRING), // e.g., ['transaction.created', 'transaction.captured']
            defaultValue: [],
            allowNull: false,
        },
    }, {
        timestamps: true,
        tableName: 'webhook_configs',
        indexes: [
            { fields: ['merchantId'] },
            { fields: ['url'] },
        ]
    });

    WebhookConfig.paginate = paginate;
    WebhookConfig.toJSON = toJSON;

    WebhookConfig.associate = (models) => {
        WebhookConfig.belongsTo(models.Merchant, { foreignKey: 'merchantId', as: 'merchant' });
        WebhookConfig.hasMany(models.WebhookEvent, { foreignKey: 'webhookConfigId', as: 'events', onDelete: 'CASCADE' });
    };

    return WebhookConfig;
};
```