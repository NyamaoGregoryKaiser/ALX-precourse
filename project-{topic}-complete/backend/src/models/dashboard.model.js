const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user.model');
const Visualization = require('./visualization.model');

const Dashboard = sequelize.define('Dashboard', {
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
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    layout: { // Stores an array of visualization IDs and their positions/sizes on the dashboard
        type: DataTypes.JSONB, // Example: [{ visualizationId: 'uuid1', x: 0, y: 0, w: 6, h: 4 }]
        defaultValue: [],
    },
    // Using a separate join table or a direct array of IDs would be more flexible
    // For simplicity, we'll store IDs directly here for now, assuming layout defines which vis are present.
    // A proper Many-to-Many would involve a DashboardVisualization model.
}, {
    tableName: 'dashboards',
    timestamps: true,
});

// Associations
Dashboard.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
User.hasMany(Dashboard, { foreignKey: 'userId', as: 'dashboards' });

module.exports = Dashboard;