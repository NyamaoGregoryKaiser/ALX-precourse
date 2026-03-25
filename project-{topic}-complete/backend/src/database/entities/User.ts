```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import bcrypt from 'bcryptjs';
import { Message } from './Message';
import { Room } from './Room';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: 'user' })
  role!: string; // e.g., 'user', 'admin'

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => Message, (message) => message.sender)
  messages!: Message[];

  // This is a many-to-many relationship for users in rooms
  // Using a simpler approach for now where Room has a list of active user IDs
  // For a more robust many-to-many, an intermediate table (e.g., UserRoom) would be used.
  // @ManyToMany(() => Room, room => room.users)
  // @JoinTable()
  // rooms!: Room[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && (this.isNew || this.isModified('password'))) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Helper properties (not directly stored in DB)
  private isNew: boolean = true;
  private isModified(field: string): boolean {
    // This is a simplification. In a real app, you'd track changes.
    // For TypeORM's BeforeUpdate, it will be called on any update.
    // To check if password changed, you'd need to load the original entity
    // or compare the hashed passwords (which is not ideal).
    // For simplicity, we assume if `password` is set, it might have changed.
    return true; // Simplistic: always re-hash if `password` property is set.
  }

  @BeforeInsert()
  setIsNew() {
    this.isNew = true;
  }

  @BeforeUpdate()
  unsetIsNew() {
    this.isNew = false;
  }
}
```