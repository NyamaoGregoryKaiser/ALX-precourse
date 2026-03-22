package com.alx.auth.system.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception to be thrown when a client exceeds the defined rate limit.
 *
 * @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS): Maps this exception to an HTTP 429 Too Many Requests status code.
 */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class TooManyRequestsException extends RuntimeException {

    /**
     * Constructs a new TooManyRequestsException with the specified detail message.
     *
     * @param message The detail message (e.g., "Too many requests from IP: ...").
     */
    public TooManyRequestsException(String message) {
        super(message);
    }
}