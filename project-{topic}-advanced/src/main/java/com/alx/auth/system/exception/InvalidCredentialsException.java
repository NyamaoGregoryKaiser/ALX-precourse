package com.alx.auth.system.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception to be thrown when user authentication fails due to invalid credentials
 * (e.g., incorrect email or password).
 *
 * @ResponseStatus(HttpStatus.UNAUTHORIZED): Maps this exception to an HTTP 401 Unauthorized status code.
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class InvalidCredentialsException extends RuntimeException {

    /**
     * Constructs a new InvalidCredentialsException with the specified detail message.
     *
     * @param message The detail message (e.g., "Invalid email or password").
     */
    public InvalidCredentialsException(String message) {
        super(message);
    }
}