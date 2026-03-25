import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { IsEmail, IsNotEmpty, Length, IsUUID } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { ChatRoomParticipant } from './ChatRoomParticipant';
import { Message } from './Message';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    @IsUUID()
    id: string;

    @Column({ unique: true })
    @IsNotEmpty()
    @Length(3, 50)
    username: string;

    @Column({ unique: true })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @Column()
    @IsNotEmpty()
    @Length(6, 100) // Stored hashed password length
    password: string;

    @Column({ default: false })
    isOnline: boolean;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    // Relations
    @OneToMany(() => ChatRoomParticipant, participant => participant.user)
    chatRoomParticipants: ChatRoomParticipant[];

    @OneToMany(() => Message, message => message.sender)
    messages: Message[];

    // Hooks or methods
    async hashPassword() {
        if (this.password && this.password.length < 100) { // Only hash if it's not already hashed
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }

    async comparePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }
}