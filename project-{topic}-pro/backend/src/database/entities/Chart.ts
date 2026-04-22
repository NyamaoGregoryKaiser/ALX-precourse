```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Dashboard } from "./Dashboard";
import { DataSource } from "./DataSource";

export enum ChartType {
    BAR = "bar",
    LINE = "line",
    PIE = "pie",
    SCATTER = "scatter",
    TABLE = "table"
}

@Entity("charts")
export class Chart {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({
        type: "enum",
        enum: ChartType,
        default: ChartType.BAR
    })
    type!: ChartType;

    @Column("jsonb") // Stores charting library specific configuration (e.g., axis, legends, colors)
    configuration!: Record<string, any>;

    @Column({ type: "text" }) // SQL query or similar data retrieval instruction
    query!: string;

    @Column("uuid")
    dashboardId!: string;

    @ManyToOne(() => Dashboard, dashboard => dashboard.charts, { onDelete: 'CASCADE' })
    dashboard!: Dashboard;

    @Column("uuid")
    dataSourceId!: string;

    @ManyToOne(() => DataSource, dataSource => dataSource.id)
    dataSource!: DataSource;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt!: Date;
}
```