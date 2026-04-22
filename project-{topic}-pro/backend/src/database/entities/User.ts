```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Dashboard } from "./Dashboard";
import { DataSource } from "./DataSource";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string; // Hashed password

    @Column({ default: "user" })
    role!: string; // e.g., 'user', 'admin'

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt!: Date;

    @OneToMany(() => Dashboard, dashboard => dashboard.user)
    dashboards!: Dashboard[];

    @OneToMany(() => DataSource, dataSource => dataSource.user)
    dataSources!: DataSource[];
}
```