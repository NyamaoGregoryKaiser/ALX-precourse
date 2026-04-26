package com.alx.scraper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception to indicate a conflict, typically when trying to create
 * a resource that already exists (e.g., a user with an existing username).
 * This exception will automatically map to an HTTP 409 (Conflict) status.
 *
 * ALX Focus: Another example of custom exception for specific business logic
 * errors, ensuring correct HTTP status codes are returned to clients.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }

    public ConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}