import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AppDataSource } from './database';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { Permission } from '@/entities/Permission';
import { UserRole } from '@/entities/UserRole';
import { RolePermission } from '@/entities/RolePermission';
import { Product } from '@/entities/Product';
import logger from '@/utils/logger';
import bcrypt from 'bcryptjs';

const seedDatabase = async (dataSource: DataSource) => {
  logger.info('Starting database seeding...');

  try {
    // Clear existing data (optional, useful for development)
    await dataSource.query('TRUNCATE "user_roles", "role_permissions", "users", "roles", "permissions", "products", "refresh_tokens" RESTART IDENTITY CASCADE;');
    logger.info('Cleared existing data.');

    // 1. Create Permissions
    const permissionsData = [
      { name: 'user:read', description: 'Read user profiles' },
      { name: 'user:write', description: 'Create/Update user profiles' },
      { name: 'user:delete', description: 'Delete user profiles' },
      { name: 'product:read', description: 'Read product information' },
      { name: 'product:write', description: 'Create/Update products' },
      { name: 'product:delete', description: 'Delete products' },
      { name: 'role:read', description: 'Read role information' },
      { name: 'role:write', description: 'Create/Update roles' },
      { name: 'role:delete', description: 'Delete roles' },
      { name: 'admin:access', description: 'Grants access to all admin functionalities' },
    ];

    const permissionRepo = dataSource.getRepository(Permission);
    const permissions = await Promise.all(
      permissionsData.map(async (data) => {
        const permission = permissionRepo.create(data);
        return await permissionRepo.save(permission);
      })
    );
    logger.info(`Created ${permissions.length} permissions.`);

    // Map permissions by name for easy lookup
    const permissionMap = new Map(permissions.map(p => [p.name, p]));

    // 2. Create Roles
    const adminRole = new Role();
    adminRole.name = 'admin';
    adminRole.description = 'Administrator with full system access';
    await dataSource.manager.save(adminRole);

    const userRole = new Role();
    userRole.name = 'user';
    userRole.description = 'Standard user with basic access';
    await dataSource.manager.save(userRole);

    const editorRole = new Role();
    editorRole.name = 'editor';
    editorRole.description = 'User who can create/edit products';
    await dataSource.manager.save(editorRole);
    logger.info('Created roles: admin, user, editor.');

    // 3. Assign Permissions to Roles
    const rolePermissionRepo = dataSource.getRepository(RolePermission);

    // Admin Role Permissions (all permissions)
    const adminPermissions = permissions.map(p => rolePermissionRepo.create({ role: adminRole, permission: p }));
    await rolePermissionRepo.save(adminPermissions);

    // User Role Permissions
    const userPermissions = [
      permissionMap.get('user:read'),
      permissionMap.get('product:read'),
    ].filter(Boolean) as Permission[]; // Filter out undefined if any permission name is wrong
    const userRolePermissions = userPermissions.map(p => rolePermissionRepo.create({ role: userRole, permission: p }));
    await rolePermissionRepo.save(userRolePermissions);

    // Editor Role Permissions
    const editorPermissions = [
      permissionMap.get('user:read'),
      permissionMap.get('product:read'),
      permissionMap.get('product:write'),
    ].filter(Boolean) as Permission[];
    const editorRolePermissions = editorPermissions.map(p => rolePermissionRepo.create({ role: editorRole, permission: p }));
    await rolePermissionRepo.save(editorRolePermissions);
    logger.info('Assigned permissions to roles.');

    // 4. Create Users
    const hashedPasswordAdmin = await bcrypt.hash('adminpassword', 10);
    const hashedPasswordUser = await bcrypt.hash('userpassword', 10);
    const hashedPasswordEditor = await bcrypt.hash('editorpassword', 10);

    const adminUser = new User();
    adminUser.username = 'admin';
    adminUser.email = 'admin@example.com';
    adminUser.password = hashedPasswordAdmin;
    adminUser.firstName = 'Super';
    adminUser.lastName = 'Admin';
    adminUser.isEmailVerified = true;
    await dataSource.manager.save(adminUser);

    const regularUser = new User();
    regularUser.username = 'user';
    regularUser.email = 'user@example.com';
    regularUser.password = hashedPasswordUser;
    regularUser.firstName = 'Regular';
    regularUser.lastName = 'User';
    regularUser.isEmailVerified = true;
    await dataSource.manager.save(regularUser);

    const editorUser = new User();
    editorUser.username = 'editor';
    editorUser.email = 'editor@example.com';
    editorUser.password = hashedPasswordEditor;
    editorUser.firstName = 'Product';
    editorUser.lastName = 'Editor';
    editorUser.isEmailVerified = true;
    await dataSource.manager.save(editorUser);
    logger.info('Created users: admin, user, editor.');

    // 5. Assign Roles to Users
    const userRoleRepo = dataSource.getRepository(UserRole);

    const adminUserRole = userRoleRepo.create({ user: adminUser, role: adminRole });
    await userRoleRepo.save(adminUserRole);

    const regularUserRole = userRoleRepo.create({ user: regularUser, role: userRole });
    await userRoleRepo.save(regularUserRole);

    const editorUserRole = userRoleRepo.create({ user: editorUser, role: editorRole });
    await userRoleRepo.save(editorUserRole);
    logger.info('Assigned roles to users.');

    // 6. Create Example Products
    const productRepo = dataSource.getRepository(Product);
    const productsData = [
      { name: 'Laptop Pro', description: 'High-performance laptop.', price: 1200.00, stock: 50 },
      { name: 'Wireless Mouse', description: 'Ergonomic wireless mouse.', price: 25.00, stock: 200 },
      { name: 'Mechanical Keyboard', description: 'RGB mechanical keyboard.', price: 80.00, stock: 100 },
    ];
    const products = productRepo.create(productsData);
    await productRepo.save(products);
    logger.info(`Created ${products.length} example products.`);


    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
};

// Initialize DataSource and run seeding
AppDataSource.initialize()
  .then((dataSource) => seedDatabase(dataSource))
  .catch((err) => logger.error('Error during data source initialization for seeding:', err));