import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { User } from "./User";
import { ScrapeJob } from "./ScrapeJob";
import { ScrapedData } from "./ScrapedData";

export interface SelectorConfig {
    items: string; // CSS selector for the main items to extract
    fields: {
        [key: string]: string; // Key-value pair where key is data field name, value is CSS selector or attribute selector (e.g., "a::attr(href)")
    };
}

export interface PaginationConfig {
    nextButton?: string; // CSS selector for the "next page" button/link
    // Add more complex pagination rules if needed, e.g., page limit, URL patterns
}

@Entity("scrapers")
export class Scraper {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 100, unique: true, nullable: false })
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "varchar", length: 2048, nullable: false })
    start_url!: string;

    @Column({ type: "jsonb", nullable: false })
    selectors_config!: SelectorConfig;

    @Column({ type: "jsonb", nullable: true })
    pagination_config?: PaginationConfig;

    @Column({ type: "uuid", nullable: false })
    user_id!: string;

    @ManyToOne(() => User, user => user.scrapers)
    @JoinColumn({ name: "user_id" })
    user!: User;

    @OneToMany(() => ScrapeJob, job => job.scraper)
    scrape_jobs!: ScrapeJob[];

    @OneToMany(() => ScrapedData, data => data.scraper)
    scraped_data!: ScrapedData[];

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    created_at!: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updated_at!: Date;
}