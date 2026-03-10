import { AppDataSource } from '../../database/data-source';
import { User } from '../../database/entities/User';
import { CustomError } from '../../utils/error';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async getAllUsers(currentUser: User): Promise<User[]> {
    return this.userRepository.find({
      where: { id: (await currentUser).id }, // Exclude current user from list for chat purposes (optional)
      select: ['id', 'username', 'email', 'createdAt'],
    });
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'createdAt'],
    });
    if (!user) {
      throw new CustomError('User not found', 404);
    }
    return user;
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    if (!query || query.trim() === '') {
      return [];
    }
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.username ILIKE :query OR user.email ILIKE :query', { query: `%${query}%` })
      .take(limit)
      .getMany();
  }
}