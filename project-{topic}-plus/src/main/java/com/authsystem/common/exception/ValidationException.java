package com.authsystem.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Custom exception for indicating business logic validation failures.
 * This exception is used when input data violates business rules,
 * beyond simple syntax validation that {@code @Valid} handles.
 *
 * Examples include:
 * - Attempting to register a user with an already existing username/email.
 * - Trying to assign a non-existent role.
 * - Password policies not met.
 * - Rate limit exceeded.
 *
 * It extends {@link RuntimeException} making it an unchecked exception.
 *
 * {@code @Getter} is a Lombok annotation to automatically generate getter methods.
 */
@Getter
public class ValidationException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus httpStatus;

    /**
     * Constructs a new ValidationException with the specified detail message.
     * Defaults to HTTP 400 Bad Request and a generic "validation_error" code.
     *
     * @param message The detail message (e.g., "Username already exists").
     */
    public ValidationException(String message) {
        super(message);
        this.errorCode = "validation_error";
        this.httpStatus = HttpStatus.BAD_REQUEST;
    }

    /**
     * Constructs a new ValidationException with the specified detail message
     * and a custom error code. Defaults to HTTP 400 Bad Request.
     *
     * @param message The detail message.
     * @param errorCode A custom application-specific error code.
     */
    public ValidationException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = HttpStatus.BAD_REQUEST;
    }

    /**
     * Constructs a new ValidationException with the specified detail message,
     * custom error code, and a specific HTTP status.
     *
     * @param message The detail message.
     * @param errorCode A custom application-specific error code.
     * @param httpStatus The HTTP status to associate with this exception.
     */
    public ValidationException(String message, String errorCode, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }
}