```java
package com.alx.webscraper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception for when an API rate limit is exceeded.
 * Maps to HTTP 429 (Too Many Requests).
 */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class CustomRateLimitException extends RuntimeException {

    public CustomRateLimitException(String message) {
        super(message);
    }

    public CustomRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}
```