```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { SlowQueryLog } from './slow-query-log.entity';
import { Recommendation } from './recommendation.entity';

export enum DatabaseType {
    POSTGRES = 'postgres',
    MYSQL = 'mysql',
    MONGODB = 'mongodb', // Conceptual, focus on SQL for this example
}

@Entity('db_connections')
export class DbConnection {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    name!: string; // User-friendly name for the connection

    @Column({ type: 'enum', enum: DatabaseType, nullable: false })
    type!: DatabaseType;

    @Column({ type: 'varchar', length: 255, nullable: false })
    host!: string;

    @Column({ type: 'int', nullable: false })
    port!: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    databaseName!: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    username!: string;

    @Column({ type: 'varchar', length: 255, nullable: false, select: false }) // Store securely, do not return by default
    password!: string; // Encrypted in a real system, or stored in a secrets manager

    @Column({ type: 'boolean', default: true })
    isActive!: boolean; // Is monitoring active for this connection?

    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    // Relationship to User
    @ManyToOne(() => User, user => user.dbConnections, { onDelete: 'CASCADE' })
    user!: User;

    @Column({ type: 'uuid' })
    userId!: string;

    // Relationships to logs and recommendations
    @OneToMany(() => SlowQueryLog, slowQueryLog => slowQueryLog.dbConnection)
    slowQueryLogs!: SlowQueryLog[];

    @OneToMany(() => Recommendation, recommendation => recommendation.dbConnection)
    recommendations!: Recommendation[];
}
```