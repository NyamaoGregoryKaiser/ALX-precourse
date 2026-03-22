```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { SlowQuery } from './SlowQuery';

export enum DatabaseType {
  POSTGRES = 'postgresql',
  MYSQL = 'mysql',
  SQLSERVER = 'sqlserver',
  ORACLE = 'oracle',
}

@Entity('databases')
export class Database {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: DatabaseType, default: DatabaseType.POSTGRES })
  type!: DatabaseType;

  @Column()
  connectionString!: string; // Encrypted in a real production system

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => User, (user) => user.databases)
  owner!: User;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @OneToMany(() => SlowQuery, (query) => query.database)
  slowQueries!: SlowQuery[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

#### `backend/src/entities/SlowQuery.ts`