```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity()
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @Column({ type: 'text' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  slug: string; // URL-friendly version of the title

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.DRAFT })
  status: PostStatus;

  @ManyToOne(() => User, user => user.posts, { onDelete: 'SET NULL' })
  author: User;

  @Column({ nullable: true })
  authorId: string; // Foreign key column for author

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // Additional fields could include:
  // @Column({ nullable: true })
  // featuredImage: string; // URL to an image

  // @ManyToMany(() => Category, category => category.posts)
  // @JoinTable()
  // categories: Category[];

  // @ManyToMany(() => Tag, tag => tag.posts)
  // @JoinTable()
  // tags: Tag[];
}
```