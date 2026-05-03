package com.alx.scraper.entity;

public enum ScrapingStatus {
    CREATED,      // Job is defined but not started
    RUNNING,      // Job is currently active
    PAUSED,       // Job is temporarily paused (future feature)
    COMPLETED,    // Job finished successfully
    FAILED,       // Job failed due to an error
    STOPPED       // Job was manually stopped
}