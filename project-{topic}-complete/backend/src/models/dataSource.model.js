const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');

const DataSource = sequelize.define('DataSource', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: { // e.g., 'csv_upload', 'json_data', 'database_connection'
        type: DataTypes.ENUM('csv_upload', 'json_data', 'database_connection'),
        allowNull: false,
    },
    config: { // Stores connection string, file path, or API endpoint
        type: DataTypes.JSONB,
        allowNull: false,
    },
    schema: { // Describes the structure of the data (e.g., column names and types)
        type: DataTypes.JSONB, // Example: [{ name: 'column1', type: 'string' }, { name: 'column2', type: 'number' }]
        allowNull: false,
    },
    data: { // For 'csv_upload' or 'json_data' types, stores the actual parsed data
        type: DataTypes.JSONB,
        allowNull: true, // Can be null for 'database_connection' type
    },
}, {
    tableName: 'data_sources',
    timestamps: true,
});

// Associations
DataSource.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
User.hasMany(DataSource, { foreignKey: 'userId', as: 'dataSources' });

module.exports = DataSource;