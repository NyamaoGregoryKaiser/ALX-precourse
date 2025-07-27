```typescript
import { DataTypes, Model, Sequelize } from 'sequelize';

interface UserAttributes {
    id: number;
    name: string;
    email: string;
    password?: string;
}


export class User extends Model<UserAttributes> implements UserAttributes {
    public id!: number;
    public name!: string;
    public email!: string;
    public password!: string;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}


export const initUser = (sequelize: Sequelize) => {
    User.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
            },

        },
        {
            sequelize,
            modelName: 'User',
        }
    );
}
```