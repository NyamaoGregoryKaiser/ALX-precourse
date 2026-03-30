import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Scraper } from "./Scraper";
import { User } from "./User";
import { ScrapedData } from "./ScrapedData";

export enum ScrapeJobStatus {
    PENDING = "pending",
    SCHEDULED = "scheduled", // For jobs queued for future execution
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
}

@Entity("scrape_jobs")
export class ScrapeJob {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid", nullable: false })
    scraper_id!: string;

    @ManyToOne(() => Scraper, scraper => scraper.scrape_jobs)
    @JoinColumn({ name: "scraper_id" })
    scraper!: Scraper;

    @Column({ type: "uuid", nullable: false })
    user_id!: string;

    @ManyToOne(() => User, user => user.scrape_jobs)
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({
        type: "enum",
        enum: ScrapeJobStatus,
        default: ScrapeJobStatus.PENDING,
        nullable: false
    })
    status!: ScrapeJobStatus;

    @Column({ type: "timestamp", nullable: true })
    started_at?: Date;

    @Column({ type: "timestamp", nullable: true })
    completed_at?: Date;

    @Column({ type: "text", nullable: true })
    log?: string; // Detailed execution log or error messages

    @Column({ type: "int", default: 0 })
    extracted_count!: number;

    @Column({ type: "timestamp", nullable: true })
    scheduled_at?: Date; // For BullMQ repeatable jobs or future manual runs

    @OneToMany(() => ScrapedData, data => data.scrape_job)
    scraped_data_entries!: ScrapedData[];

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    created_at!: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updated_at!: Date;
}