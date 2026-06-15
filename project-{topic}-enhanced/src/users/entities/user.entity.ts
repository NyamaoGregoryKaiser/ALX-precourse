```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { Category } from '../../categories/entities/category.entity';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

@Entity('users')
@Unique(['username']) // Ensures username is unique across all users
export class User {
  @ApiProperty({ description: 'Unique identifier of the user', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Unique username of the user', example: 'john_doe' })
  @Column({ length: 20, nullable: false })
  username: string;

  @ApiHideProperty() // Hide password from Swagger documentation
  @Column({ nullable: false })
  password: string;

  @ApiProperty({
    type: () => [Task],
    description: 'List of tasks created by the user',
    nullable: true,
  })
  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];

  @ApiProperty({
    type: () => [Category],
    description: 'List of categories created by the user',
    nullable: true,
  })
  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];

  @ApiProperty({ description: 'Timestamp when the user account was created', example: '2023-10-27T10:00:00.000Z' })
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the user account was last updated', example: '2023-10-27T10:30:00.000Z' })
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```