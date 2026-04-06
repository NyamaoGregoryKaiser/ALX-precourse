```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, OneToMany } from 'typeorm';
import { DbConnection } from './db-connection.entity';
import { Recommendation } from './recommendation.entity';
import { SlowQueryLog } from './slow-query-log.entity';

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
}

@Entity('users')
@Unique(['email'])
@Unique(['username'])
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    username!: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    email!: string;

    @Column({ type: 'varchar', length: 255, nullable: false, select: false }) // `select: false` prevents password from being returned by default queries
    password!: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
        nullable: false,
    })
    role!: UserRole;

    @Column({ type: 'text', nullable: true })
    refreshToken?: string;

    @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt!: Date;

    // Relationships
    @OneToMany(() => DbConnection, dbConnection => dbConnection.user)
    dbConnections!: DbConnection[];

    @OneToMany(() => Recommendation, recommendation => recommendation.user)
    recommendations!: Recommendation[];

    @OneToMany(() => SlowQueryLog, slowQueryLog => slowQueryLog.user)
    slowQueryLogs!: SlowQueryLog[];
}
```