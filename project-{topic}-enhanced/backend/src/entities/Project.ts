import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Task } from './Task';

@Entity()
export class Project extends BaseEntity {
  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => User, user => user.projects, { onDelete: 'CASCADE' })
  owner!: User;

  @Column()
  ownerId!: string; // Explicit column for ownerId

  @OneToMany(() => Task, task => task.project)
  tasks!: Task[];
}