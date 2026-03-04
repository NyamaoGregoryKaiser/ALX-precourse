package com.authsystem.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Custom exception to indicate that a requested resource was not found.
 * This exception is typically thrown when an entity (e.g., User, Role)
 * cannot be found in the database based on the provided identifier.
 *
 * It extends {@link RuntimeException} making it an unchecked exception,
 * which is common for application-specific errors that don't need to be declared
 * in method signatures.
 *
 * {@code @Getter} is a Lombok annotation to automatically generate getter methods.
 */
@Getter
public class ResourceNotFoundException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus httpStatus;

    /**
     * Constructs a new ResourceNotFoundException with the specified detail message.
     *
     * @param message The detail message (e.g., "User not found with ID: 123").
     */
    public ResourceNotFoundException(String message) {
        super(message);
        this.errorCode = "resource_not_found";
        this.httpStatus = HttpStatus.NOT_FOUND;
    }

    /**
     * Constructs a new ResourceNotFoundException with the specified detail message
     * and a custom error code.
     *
     * @param message The detail message.
     * @param errorCode A custom application-specific error code.
     */
    public ResourceNotFoundException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = HttpStatus.NOT_FOUND;
    }

    /**
     * Constructs a new ResourceNotFoundException with the specified detail message,
     * custom error code, and a specific HTTP status.
     *
     * @param message The detail message.
     * @param errorCode A custom application-specific error code.
     * @param httpStatus The HTTP status to associate with this exception.
     */
    public ResourceNotFoundException(String message, String errorCode, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }
}