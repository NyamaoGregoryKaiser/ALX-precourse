import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Scraper } from "./Scraper";
import { ScrapeJob } from "./ScrapeJob";

export enum UserRole {
    ADMIN = "admin",
    USER = "user"
}

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 50, unique: true, nullable: false })
    username!: string;

    @Column({ type: "varchar", length: 100, unique: true, nullable: false })
    email!: string;

    @Column({ type: "varchar", nullable: false })
    password_hash!: string;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.USER,
        nullable: false
    })
    role!: UserRole;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    created_at!: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updated_at!: Date;

    @OneToMany(() => Scraper, scraper => scraper.user)
    scrapers!: Scraper[];

    @OneToMany(() => ScrapeJob, job => job.user)
    scrape_jobs!: ScrapeJob[];
}