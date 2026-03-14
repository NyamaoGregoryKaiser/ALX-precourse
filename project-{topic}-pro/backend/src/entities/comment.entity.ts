import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Task } from "./task.entity";
import { User } from "./user.entity";

@Entity('comments')
export class Comment {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'text' })
    content!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Task, task => task.comments, { onDelete: 'CASCADE' })
    task!: Task;

    @Column({ name: 'task_id' })
    taskId!: string;

    @ManyToOne(() => User, user => user.comments, { onDelete: 'SET NULL', nullable: true })
    author?: User;

    @Column({ name: 'author_id', nullable: true })
    authorId?: string;
}