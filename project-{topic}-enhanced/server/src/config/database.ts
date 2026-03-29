import { DataSource } from 'typeorm';
import { config } from '@/config';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { Permission } from '@/entities/Permission';
import { UserRole } from '@/entities/UserRole';
import { RolePermission } from '@/entities/RolePermission';
import { RefreshToken } from '@/entities/RefreshToken';
import { Product } from '@/entities/Product';
import { UserSubscriber } from '@/subscribers/UserSubscriber';
import path from 'path';

const isTest = config.env === 'test';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: isTest ? config.database.testName : config.database.name,
  synchronize: false, // NEVER true in production! Use migrations.
  logging: config.env === 'development',
  entities: [User, Role, Permission, UserRole, RolePermission, RefreshToken, Product],
  migrations: [path.join(__dirname, '../migrations/**/*.ts')],
  subscribers: [UserSubscriber],
});