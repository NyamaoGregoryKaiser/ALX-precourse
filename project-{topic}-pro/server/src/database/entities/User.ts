import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { ConversationParticipant } from './ConversationParticipant';
import { Message } from './Message';
import bcrypt from 'bcryptjs';

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

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => ConversationParticipant, participant => participant.user)
  conversations!: ConversationParticipant[];

  @OneToMany(() => Message, message => message.sender)
  messages!: Message[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && (this.isNew || this.isModified('password'))) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Helper properties for BeforeInsert/BeforeUpdate hook logic
  // These are not actual database columns, just for internal logic
  isNew?: boolean = true; // Mark true on creation, false after first save
  private _modifiedFields: Set<string> = new Set();

  setModified(field: string) {
    this._modifiedFields.add(field);
  }

  isModified(field: string): boolean {
    return this._modifiedFields.has(field);
  }
}