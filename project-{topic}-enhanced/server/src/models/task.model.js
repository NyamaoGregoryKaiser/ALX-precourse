module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM,
      values: ['to_do', 'in_progress', 'done'],
      defaultValue: 'to_do',
    },
    priority: {
      type: DataTypes.ENUM,
      values: ['low', 'medium', 'high'],
      defaultValue: 'medium',
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true, // Task can be unassigned
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'tasks',
    timestamps: true,
  });

  Task.associate = (models) => {
    Task.belongsTo(models.Project, {
      foreignKey: 'projectId',
      as: 'project',
    });
    Task.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee',
    });
    Task.hasMany(models.Comment, {
      foreignKey: 'taskId',
      as: 'comments',
      onDelete: 'CASCADE',
    });
  };

  return Task;
};