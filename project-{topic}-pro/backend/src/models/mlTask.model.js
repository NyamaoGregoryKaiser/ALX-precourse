const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MLTask = sequelize.define(
    'MLTask',
    {
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
          model: 'Projects', // This is a reference to the table name
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: DataTypes.STRING, // e.g., 'min_max_scaling', 'one_hot_encoding', 'accuracy_score'
        allowNull: false,
        validate: {
          isIn: [
            [
              'min_max_scaling',
              'standardization',
              'one_hot_encoding',
              'label_encoding',
              'missing_value_imputation',
              'accuracy_score',
              'precision_score',
              'recall_score',
              'f1_score',
              'mse',
              'rmse',
              'mae',
            ],
          ],
        },
      },
      inputData: {
        type: DataTypes.JSONB, // Store complex input data as JSON
        allowNull: false,
        get() {
          const rawValue = this.getDataValue('inputData');
          return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        },
        set(value) {
          this.setDataValue('inputData', typeof value === 'object' ? JSON.stringify(value) : value);
        },
      },
      parameters: {
        type: DataTypes.JSONB, // Store parameters for the task as JSON
        allowNull: true, // Some tasks might not need parameters
        get() {
          const rawValue = this.getDataValue('parameters');
          return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        },
        set(value) {
          this.setDataValue('parameters', typeof value === 'object' ? JSON.stringify(value) : value);
        },
      },
      outputData: {
        type: DataTypes.JSONB, // Store results of the task as JSON
        allowNull: true, // Will be null initially, populated after execution
        get() {
          const rawValue = this.getDataValue('outputData');
          return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        },
        set(value) {
          this.setDataValue('outputData', typeof value === 'object' ? JSON.stringify(value) : value);
        },
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'MLTasks',
    }
  );

  return MLTask;
};