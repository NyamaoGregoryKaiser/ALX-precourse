```java
package com.alx.webscraper.model;

/**
 * Enumeration for the possible statuses of a scraping task.
 */
public enum ScrapingTaskStatus {
    PENDING,    // Task is created but not yet started or scheduled
    RUNNING,    // Task is currently being executed
    SCHEDULED,  // Task is scheduled for future execution
    COMPLETED,  // Task finished successfully
    FAILED,     // Task failed during execution
    STOPPED,    // Task was manually stopped
    DISABLED    // Task is temporarily disabled
}
```