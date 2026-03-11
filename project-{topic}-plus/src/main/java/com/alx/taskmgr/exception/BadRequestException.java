```java
package com.alx.taskmgr.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception for indicating a bad request (HTTP 400).
 * This exception should be thrown when the client sends an invalid request,
 * e.g., missing parameters, invalid data format, or business rule violation.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }

    public BadRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
```