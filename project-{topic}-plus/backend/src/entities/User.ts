```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Dashboard } from './Dashboard';
import { DataSource } from './DataSource';
import { Chart } from './Chart';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string; // Hashed password

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Dashboard, (dashboard) => dashboard.user)
  dashboards!: Dashboard[];

  @OneToMany(() => DataSource, (dataSource) => dataSource.user)
  dataSources!: DataSource[];

  @OneToMany(() => Chart, (chart) => chart.user)
  charts!: Chart[];
}
```