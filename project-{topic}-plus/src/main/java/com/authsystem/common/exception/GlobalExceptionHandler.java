package com.authsystem.common.exception;

import com.authsystem.common.dto.ApiResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler for the application.
 * This class uses Spring's {@code @ControllerAdvice} to provide centralized
 * exception handling across all {@code @RequestMapping} methods.
 * It ensures consistent and user-friendly error responses for various exceptions.
 *
 * It extends {@link ResponseEntityExceptionHandler} to customize the handling
 * of standard Spring MVC exceptions.
 */
@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles {@link ResourceNotFoundException}.
     * This exception is thrown when a requested resource (e.g., User, Role) is not found.
     * Returns a 404 Not Found status.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        logger.warn("ResourceNotFoundException: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), ex.getErrorCode(), request.getDescription(false));
    }

    /**
     * Handles {@link ValidationException}.
     * This custom exception is used for business logic validation failures (e.g., duplicate username, invalid input).
     * Returns a 400 Bad Request or a specified custom status.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationException(ValidationException ex, WebRequest request) {
        logger.warn("ValidationException: {}", ex.getMessage());
        return buildErrorResponse(ex.getHttpStatus(), ex.getMessage(), ex.getErrorCode(), request.getDescription(false));
    }

    /**
     * Handles {@link ConstraintViolationException} for violations raised by JPA
     * when validating entity constraints (e.g., unique constraints).
     * Returns a 400 Bad Request.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleConstraintViolationException(ConstraintViolationException ex, WebRequest request) {
        logger.error("ConstraintViolationException: {}", ex.getMessage());
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(violation ->
                errors.put(violation.getPropertyPath().toString(), violation.getMessage()));
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Validation failed", "constraint_violation", errors, request.getDescription(false));
    }

    /**
     * Handles {@link DataIntegrityViolationException} for issues like duplicate keys or foreign key violations.
     * Returns a 409 Conflict status.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolationException(DataIntegrityViolationException ex, WebRequest request) {
        logger.error("DataIntegrityViolationException: {}", ex.getMessage());
        String errorMessage = "Data integrity violation: " + ex.getRootCause().getMessage();
        return buildErrorResponse(HttpStatus.CONFLICT, errorMessage, "data_integrity_violation", request.getDescription(false));
    }

    /**
     * Handles {@link BadCredentialsException} thrown by Spring Security for incorrect username/password during login.
     * Returns a 401 Unauthorized status.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentialsException(BadCredentialsException ex, WebRequest request) {
        logger.warn("BadCredentialsException: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Invalid username or password", "bad_credentials", request.getDescription(false));
    }

    /**
     * Handles {@link AccessDeniedException} thrown by Spring Security when a user attempts
     * to access a resource they do not have permission for.
     * Returns a 403 Forbidden status.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        logger.warn("AccessDeniedException: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Access denied. You do not have permission to access this resource.", "access_denied", request.getDescription(false));
    }

    /**
     * Handles general {@link EntityNotFoundException} which might be thrown by JPA
     * (e.g., `em.getReference(id)` when ID does not exist).
     * Returns a 404 Not Found status.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleJpaEntityNotFoundException(EntityNotFoundException ex, WebRequest request) {
        logger.warn("EntityNotFoundException: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Entity not found", "entity_not_found", request.getDescription(false));
    }

    /**
     * Handles {@link DisabledException} thrown by Spring Security when an authenticated
     * user's account is disabled.
     * Returns a 401 Unauthorized status.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiResponse<Object>> handleDisabledException(DisabledException ex, WebRequest request) {
        logger.warn("DisabledException: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "User account is disabled", "account_disabled", request.getDescription(false));
    }

    /**
     * Handles {@link LockedException} thrown by Spring Security when an authenticated
     * user's account is locked.
     * Returns a 401 Unauthorized status.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ApiResponse<Object>> handleLockedException(LockedException ex, WebRequest request) {
        logger.warn("LockedException: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "User account is locked", "account_locked", request.getDescription(false));
    }


    /**
     * Catches any other unexpected exceptions and returns a generic 500 Internal Server Error.
     * This is the fallback for unhandled exceptions.
     *
     * @param ex The exception that was thrown.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGlobalException(Exception ex, WebRequest request) {
        logger.error("Unhandled Exception: {}", ex.getMessage(), ex); // Log full stack trace for unhandled errors
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.", "internal_server_error", request.getDescription(false));
    }

    /**
     * Customizes the handling of {@link MethodArgumentNotValidException}
     * (e.g., when `@Valid` annotation fails on a request body).
     * Extracts all validation errors and returns them in the response.
     * Returns a 400 Bad Request status.
     *
     * @param ex The exception that was thrown.
     * @param headers The HTTP headers.
     * @param status The HTTP status code.
     * @param request The web request during which the exception occurred.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with error details.
     */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers,
                                                                  HttpStatusCode status,
                                                                  WebRequest request) {
        logger.warn("MethodArgumentNotValidException: {}", ex.getMessage());
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return new ResponseEntity<>(ApiResponse.error(status.value(), "Validation failed", "method_argument_not_valid", errors, request.getDescription(false)), headers, status);
    }

    /**
     * Helper method to build a consistent error response.
     *
     * @param status The HTTP status to return.
     * @param message The error message.
     * @param errorCode A custom application-specific error code.
     * @param path The request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse}.
     */
    private ResponseEntity<ApiResponse<Object>> buildErrorResponse(HttpStatus status, String message, String errorCode, String path) {
        return new ResponseEntity<>(ApiResponse.error(status.value(), message, errorCode, null, path), status);
    }

    /**
     * Helper method to build a consistent error response with additional data.
     *
     * @param status The HTTP status to return.
     * @param message The error message.
     * @param errorCode A custom application-specific error code.
     * @param data Additional data related to the error (e.g., validation errors map).
     * @param path The request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse}.
     */
    private ResponseEntity<ApiResponse<Object>> buildErrorResponse(HttpStatus status, String message, String errorCode, Object data, String path) {
        return new ResponseEntity<>(ApiResponse.error(status.value(), message, errorCode, data, path), status);
    }
}