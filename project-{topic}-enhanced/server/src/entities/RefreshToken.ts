import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  token!: string;

  @Column()
  expiresAt!: Date;

  @Column({ default: false })
  isRevoked!: boolean;

  @ManyToOne(() => User, user => user.refreshTokens, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  userId!: string; // To avoid circular dependency for `user` relation if not loaded

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}