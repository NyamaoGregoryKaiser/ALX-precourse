const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');
const DataSource = require('./dataSource.model');

const Visualization = sequelize.define('Visualization', {
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
    dataSourceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: DataSource,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: { // e.g., 'bar', 'line', 'pie', 'table'
        type: DataTypes.ENUM('bar', 'line', 'pie', 'table'),
        allowNull: false,
    },
    config: { // Chart specific configuration (e.g., x-axis, y-axis, colors, title)
        type: DataTypes.JSONB,
        allowNull: false,
    },
    filters: { // Array of filter objects to apply to the data
        type: DataTypes.JSONB,
        defaultValue: [],
    },
    groupBy: { // Field to group by for aggregations
        type: DataTypes.STRING,
        allowNull: true,
    },
    aggregates: { // Array of aggregation operations
        type: DataTypes.JSONB, // Example: [{ field: 'sales', operation: 'sum' }]
        defaultValue: [],
    },
}, {
    tableName: 'visualizations',
    timestamps: true,
});

// Associations
Visualization.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
Visualization.belongsTo(DataSource, { foreignKey: 'dataSourceId', as: 'source' });
User.hasMany(Visualization, { foreignKey: 'userId', as: 'visualizations' });
DataSource.hasMany(Visualization, { foreignKey: 'dataSourceId', as: 'visualizations' });

module.exports = Visualization;