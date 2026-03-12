'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('data_sources', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users', // Name of the table
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
        type: Sequelize.ENUM('csv_upload', 'json_data', 'database_connection'),
        allowNull: false,
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      schema: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      data: {
        type: Sequelize.JSONB, // Stores actual data for 'csv_upload' and 'json_data'
        allowNull: true,
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

    await queryInterface.addIndex('data_sources', ['userId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('data_sources');
  }
};