package com.alx.auth.system.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception to be thrown when a requested user cannot be found in the system.
 *
 * @ResponseStatus(HttpStatus.NOT_FOUND): Maps this exception to an HTTP 404 Not Found status code.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends RuntimeException {

    /**
     * Constructs a new UserNotFoundException with the specified detail message.
     *
     * @param message The detail message (e.g., "User with ID ... not found").
     */
    public UserNotFoundException(String message) {
        super(message);
    }
}