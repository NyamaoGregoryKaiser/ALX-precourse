```javascript
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isAlphanumeric: {
          msg: 'Username can only contain letters and numbers.',
        },
        len: {
          args: [3, 30],
          msg: 'Username must be between 3 and 30 characters.',
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Please enter a valid email address.',
        },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [6, 255],
          msg: 'Password must be at least 6 characters long.',
        },
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false,
    },
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['username']
      },
      {
        unique: true,
        fields: ['email']
      }
    ]
  });

  // Hash password before saving
  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  // Instance method to compare password
  User.prototype.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  User.associate = (models) => {
    User.hasMany(models.Dataset, { foreignKey: 'userId', onDelete: 'CASCADE' });
    User.hasMany(models.Model, { foreignKey: 'userId', onDelete: 'CASCADE' });
    User.hasMany(models.UtilityLog, { foreignKey: 'userId', onDelete: 'SET NULL' });
  };

  return User;
};
```

*(Similarly, `dataset.js`, `model.js`, `utilityLog.js` would be defined in `backend/models`.)*

**Schema Outlines:**

*   **Dataset Model (`backend/models/dataset.js`):**
    ```javascript
    // ...
    id: DataTypes.UUID (PK)
    userId: DataTypes.UUID (FK to User)
    name: DataTypes.STRING
    description: DataTypes.TEXT
    filePath: DataTypes.STRING // Path on server where file is stored
    originalFileName: DataTypes.STRING
    fileSize: DataTypes.INTEGER // in bytes
    mimeType: DataTypes.STRING
    columnMetadata: DataTypes.JSONB // e.g., { "column1": { "type": "numeric", "missing": 5 }, ... }
    uploadDate: DataTypes.DATE
    // ...
    ```
*   **Model Model (`backend/models/model.js`):**
    ```javascript
    // ...
    id: DataTypes.UUID (PK)
    userId: DataTypes.UUID (FK to User)
    name: DataTypes.STRING
    version: DataTypes.STRING
    type: DataTypes.ENUM('classification', 'regression', 'clustering', 'other')
    framework: DataTypes.STRING // e.g., 'scikit-learn', 'tensorflow', 'pytorch', 'onnx'
    filePath: DataTypes.STRING // Path to the model file
    originalFileName: DataTypes.STRING
    metrics: DataTypes.JSONB // e.g., { "accuracy": 0.95, "precision": 0.88 }
    trainingParams: DataTypes.JSONB // e.g., { "epochs": 10, "learning_rate": 0.001 }
    preprocessingParams: DataTypes.JSONB // e.g., { "scaler": "MinMax", "min": [0,1], "max": [10,20] }
    uploadDate: DataTypes.DATE
    // ...
    ```
*   **UtilityLog Model (`backend/models/utilityLog.js`):**
    ```javascript
    // ...
    id: DataTypes.UUID (PK)
    userId: DataTypes.UUID (FK to User)
    datasetId: DataTypes.UUID (FK to Dataset, nullable)
    modelId: DataTypes.UUID (FK to Model, nullable)
    utilityType: DataTypes.ENUM('minmax_scaling', 'standard_scaling', 'one_hot_encoding', 'imputation_mean', 'imputation_median', 'imputation_mode', 'train_test_split')
    parametersUsed: DataTypes.JSONB // e.g., { "columns": ["age", "fare"], "strategy": "mean", "test_size": 0.2 }
    resultMetadata: DataTypes.JSONB // e.g., { "newFilePath": "/path/to/transformed.csv", "stats": {...} }
    createdAt: DataTypes.DATE
    // ...
    ```

**Migrations (`backend/migrations`):**