```typescript
import { Sequelize } from 'sequelize';
import { DataTypes } from 'sequelize';
import { config } from '../config/config';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];


export const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  dialect: dbConfig.dialect,
  logging: false,
});

export const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
  },
  updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
  }
});


// Other models (e.g., User, Category) would go here...


//Define relationships between models if needed (e.g., one-to-many between User and Post)

```