```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('categories')
@Unique(['name', 'user']) // Ensures a user cannot have two categories with the same name
export class Category {
  @ApiProperty({ description: 'Unique identifier of the category', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Name of the category', example: 'Work' })
  @Column({ length: 50, nullable: false })
  name: string;

  @ApiProperty({
    description: 'Description of the category',
    example: 'Tasks related to my professional work.',
    nullable: true,
  })
  @Column({ length: 255, nullable: true })
  description: string;

  @ApiProperty({ type: () => User, description: 'The user who owns this category' })
  @ManyToOne(() => User, (user) => user.categories, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({
    type: () => [Task],
    description: 'List of tasks associated with this category',
    nullable: true,
  })
  @OneToMany(() => Task, (task) => task.category)
  tasks: Task[];

  @ApiProperty({ description: 'Timestamp when the category was created', example: '2023-10-27T10:00:00.000Z' })
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the category was last updated', example: '2023-10-27T10:30:00.000Z' })
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```