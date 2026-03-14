import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { User } from "./user.entity";
import { Project } from "./project.entity";

@Entity('workspaces')
export class Workspace {
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

    @ManyToOne(() => User, user => user.workspaces, { onDelete: 'CASCADE' })
    owner!: User;

    @Column({ name: 'owner_id' })
    ownerId!: string;

    @OneToMany(() => Project, project => project.workspace)
    projects!: Project[];
}