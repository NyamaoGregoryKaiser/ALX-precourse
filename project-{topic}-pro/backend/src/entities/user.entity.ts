import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Workspace } from "./workspace.entity";
import { Task } from "./task.entity";
import { Comment } from "./comment.entity";
import bcrypt from 'bcryptjs';

export enum UserRole {
    ADMIN = 'admin',
    MEMBER = 'member',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ select: false }) // Password should not be selected by default
    password!: string;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.MEMBER,
    })
    role!: UserRole;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @OneToMany(() => Workspace, workspace => workspace.owner)
    workspaces!: Workspace[];

    @OneToMany(() => Project, project => project.owner)
    ownedProjects!: Project[];

    @OneToMany(() => Task, task => task.assignee)
    assignedTasks!: Task[];

    @OneToMany(() => Comment, comment => comment.author)
    comments!: Comment[];

    // --- Hooks/Methods ---

    async hashPassword() {
        this.password = await bcrypt.hash(this.password, 10);
    }

    async comparePassword(candidatePassword: string): Promise<boolean> {
        return bcrypt.compare(candidatePassword, this.password);
    }
}