package com.alx.auth.system.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception to be thrown when attempting to create a user
 * with an email that already exists in the system.
 *
 * @ResponseStatus(HttpStatus.CONFLICT): Maps this exception to an HTTP 409 Conflict status code.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateUserException extends RuntimeException {

    /**
     * Constructs a new DuplicateUserException with the specified detail message.
     *
     * @param message The detail message (e.g., "User with email ... already exists").
     */
    public DuplicateUserException(String message) {
        super(message);
    }
}