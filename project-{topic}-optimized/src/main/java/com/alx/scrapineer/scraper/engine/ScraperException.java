```java
package com.alx.scrapineer.scraper.engine;

/**
 * Custom exception for errors occurring during the scraping process.
 */
public class ScraperException extends RuntimeException {
    public ScraperException(String message) {
        super(message);
    }

    public ScraperException(String message, Throwable cause) {
        super(message, cause);
    }
}
```