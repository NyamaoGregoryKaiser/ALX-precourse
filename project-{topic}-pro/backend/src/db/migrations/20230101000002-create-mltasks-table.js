'use strict';
const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('MLTasks', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      projectId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: DataTypes.STRING, // e.g., 'min_max_scaling', 'one_hot_encoding', 'accuracy_score'
        allowNull: false,
      },
      inputData: {
        type: DataTypes.JSONB, // Store complex input data as JSON
        allowNull: false,
      },
      parameters: {
        type: DataTypes.JSONB, // Store parameters for the task as JSON
        allowNull: true, // Some tasks might not need parameters
      },
      outputData: {
        type: DataTypes.JSONB, // Store results of the task as JSON
        allowNull: true, // Will be null initially, populated after execution
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('MLTasks');
  }
};