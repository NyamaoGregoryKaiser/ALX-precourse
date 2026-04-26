package com.alx.scraper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception to indicate that the user is not authorized to perform an action.
 * This can be used when a user is authenticated but lacks the necessary permissions
 * for a specific resource or operation.
 * Maps to HTTP 403 (Forbidden).
 *
 * ALX Focus: Separating authentication (401 Unauthorized - not logged in/invalid token)
 * from authorization (403 Forbidden - logged in but no permission).
 */
@ResponseStatus(HttpStatus.FORBIDDEN) // Use FORBIDDEN for authorization failures
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}