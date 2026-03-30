import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { ScrapeJob } from "./ScrapeJob";
import { Scraper } from "./Scraper";

@Entity("scraped_data")
export class ScrapedData {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid", nullable: false })
    scrape_job_id!: string;

    @ManyToOne(() => ScrapeJob, job => job.scraped_data_entries, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "scrape_job_id" })
    scrape_job!: ScrapeJob;

    @Column({ type: "uuid", nullable: false })
    scraper_id!: string;

    @ManyToOne(() => Scraper, scraper => scraper.scraped_data, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "scraper_id" })
    scraper!: Scraper;

    @Column({ type: "jsonb", nullable: false })
    data!: Record<string, any>; // The actual scraped data as a JSON object

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    created_at!: Date;
}