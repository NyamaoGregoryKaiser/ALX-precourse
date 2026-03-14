import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { Comment } from "./comment.entity";
import { Tag } from "./tag.entity";

export enum TaskStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    REVIEW = 'review',
    CLOSED = 'closed',
    ARCHIVED = 'archived',
}

export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({
        type: "enum",
        enum: TaskStatus,
        default: TaskStatus.OPEN,
    })
    status!: TaskStatus;

    @Column({
        type: "enum",
        enum: TaskPriority,
        default: TaskPriority.MEDIUM,
    })
    priority!: TaskPriority;

    @Column({ type: 'timestamp', nullable: true, name: 'due_date' })
    dueDate?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @ManyToOne(() => Project, project => project.tasks, { onDelete: 'CASCADE' })
    project!: Project;

    @Column({ name: 'project_id' })
    projectId!: string;

    @ManyToOne(() => User, user => user.assignedTasks, { onDelete: 'SET NULL', nullable: true })
    assignee?: User;

    @Column({ name: 'assignee_id', nullable: true })
    assigneeId?: string;

    @OneToMany(() => Comment, comment => comment.task)
    comments!: Comment[];

    @ManyToMany(() => Tag, tag => tag.tasks)
    @JoinTable({
        name: 'task_tags',
        joinColumn: { name: 'task_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
    })
    tags!: Tag[];
}