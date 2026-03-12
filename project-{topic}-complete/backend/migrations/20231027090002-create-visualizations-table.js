'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('visualizations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dataSourceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'data_sources',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('bar', 'line', 'pie', 'table'),
        allowNull: false,
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      filters: {
        type: Sequelize.JSONB,
        defaultValue: [],
        allowNull: false,
      },
      groupBy: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      aggregates: {
        type: Sequelize.JSONB,
        defaultValue: [],
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('visualizations', ['userId']);
    await queryInterface.addIndex('visualizations', ['dataSourceId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('visualizations');
  }
};