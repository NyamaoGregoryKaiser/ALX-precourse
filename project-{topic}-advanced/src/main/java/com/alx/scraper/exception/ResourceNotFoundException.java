package com.alx.scraper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception to indicate that a requested resource was not found.
 * This exception will automatically map to an HTTP 404 (Not Found) status
 * when thrown from a Spring Controller, thanks to {@code @ResponseStatus}.
 *
 * ALX Focus: Custom exception handling for specific business errors,
 * leading to cleaner controller code and standardized API error responses.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}