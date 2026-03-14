import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from "typeorm";
import { Task } from "./task.entity";

@Entity('tags')
export class Tag {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    name!: string;

    @Column({ nullable: true })
    color?: string; // e.g., for UI representation

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @ManyToMany(() => Task, task => task.tags)
    tasks!: Task[];
}