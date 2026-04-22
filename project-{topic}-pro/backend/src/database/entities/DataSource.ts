```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

export enum DataSourceType {
    POSTGRES = "postgresql",
    MYSQL = "mysql",
    MONGODB = "mongodb", // Conceptual, not fully implemented here
    CSV_UPLOAD = "csv_upload" // Conceptual
}

@Entity("data_sources")
export class DataSource {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({
        type: "enum",
        enum: DataSourceType,
        default: DataSourceType.POSTGRES
    })
    type!: DataSourceType;

    @Column("jsonb", { nullable: true }) // Store connection details securely
    connectionDetails!: Record<string, any>;

    @Column("uuid")
    userId!: string;

    @ManyToOne(() => User, user => user.dataSources)
    user!: User;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt!: Date;
}
```