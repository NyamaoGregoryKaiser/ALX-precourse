import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Workspace } from "./workspace.entity";
import { User } from "./user.entity";
import { Task } from "./task.entity";

@Entity('projects')
export class Project {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    description?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Workspace, workspace => workspace.projects, { onDelete: 'CASCADE' })
    workspace!: Workspace;

    @Column({ name: 'workspace_id' })
    workspaceId!: string;

    @ManyToOne(() => User, user => user.ownedProjects, { onDelete: 'SET NULL', nullable: true })
    owner?: User; // Project can have an owner (creator)

    @Column({ name: 'owner_id', nullable: true })
    ownerId?: string;

    @OneToMany(() => Task, task => task.project)
    tasks!: Task[];
}