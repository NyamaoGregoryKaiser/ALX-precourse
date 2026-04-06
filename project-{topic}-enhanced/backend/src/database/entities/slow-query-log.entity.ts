```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { DbConnection } from './db-connection.entity';
import { User } from './user.entity';

@Entity('slow_query_logs')
@Index(['dbConnection', 'queryHash', 'createdAt']) // Optimize queries for finding specific logs
export class SlowQueryLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text', nullable: false })
    query!: string;

    @Column({ type: 'varchar', length: 64, nullable: false })
    queryHash!: string; // MD5/SHA256 hash of the normalized query for grouping

    @Column({ type: 'int', nullable: false })
    durationMs!: number; // Query execution duration in milliseconds

    @Column({ type: 'text', nullable: true })
    executionPlan?: string; // EXPLAIN output

    @Column({ type: 'jsonb', nullable: true })
    metadata?: object; // Additional info like client IP, user, table accessed

    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    // Relationships
    @ManyToOne(() => DbConnection, dbConnection => dbConnection.slowQueryLogs, { onDelete: 'CASCADE' })
    dbConnection!: DbConnection;

    @Column({ type: 'uuid' })
    dbConnectionId!: string;

    @ManyToOne(() => User, user => user.slowQueryLogs, { onDelete: 'CASCADE' })
    user!: User;

    @Column({ type: 'uuid' })
    userId!: string;
}
```