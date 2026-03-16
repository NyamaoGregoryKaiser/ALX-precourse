import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { Visualization } from './Visualization';

@Entity('dashboards')
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  // Layout configuration (e.g., grid positions for visualizations)
  @Column({ type: 'jsonb', nullable: true })
  layout!: any;

  @ManyToOne(() => User, user => user.dashboards, { onDelete: 'CASCADE' })
  owner!: User;

  @Column()
  ownerId!: string;

  @OneToMany(() => Visualization, visualization => visualization.dashboard)
  visualizations!: Visualization[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}