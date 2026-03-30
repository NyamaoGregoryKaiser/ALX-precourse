import { DataSource } from 'typeorm';
import { User, UserRole } from '../entities/User';
import bcrypt from 'bcryptjs';

export class UserSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);

    // Check if users already exist to prevent duplicates
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log('Users already exist, skipping user seed.');
      return;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    const usersData = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: hashedPassword,
        role: UserRole.USER,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: hashedPassword,
        role: UserRole.USER,
      },
    ];

    await userRepository.save(usersData);
    console.log('Users seeded successfully!');
  }
}