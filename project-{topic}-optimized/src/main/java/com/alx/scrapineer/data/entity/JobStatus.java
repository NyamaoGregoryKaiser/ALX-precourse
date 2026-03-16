```java
package com.alx.scrapineer.data.entity;

/**
 * Statuses for a scraping job.
 */
public enum JobStatus {
    CREATED,    // Job has been defined but not yet run or scheduled
    SCHEDULED,  // Job is scheduled to run periodically
    RUNNING,    // Job is currently executing
    COMPLETED,  // Job finished successfully
    FAILED,     // Job failed to complete
    STOPPED,    // Job was manually stopped
    PAUSED      // Scheduled job is temporarily paused
}
```