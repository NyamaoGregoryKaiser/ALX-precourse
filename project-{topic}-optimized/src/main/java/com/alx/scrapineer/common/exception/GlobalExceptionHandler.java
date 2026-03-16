```java
package com.alx.scrapineer.common.exception;

import com.alx.scrapineer.api.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.Date;
import java.util.stream.Collectors;

/**
 * Global exception handler for the application.
 * Provides consistent error responses for various exceptions.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles custom ResourceNotFoundException.
     * @param ex The exception.
     * @param request The web request.
     * @return ResponseEntity with NOT_FOUND status and error details.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        logger.warn("Resource Not Found: {}", ex.getMessage());
        ErrorResponse errorDetails = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                new Date(),
                ex.getMessage(),
                request.getDescription(false)
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.NOT_FOUND);
    }

    /**
     * Handles custom BadRequestException.
     * @param ex The exception.
     * @param request The web request.
     * @return ResponseEntity with BAD_REQUEST status and error details.
     */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(BadRequestException ex, WebRequest request) {
        logger.warn("Bad Request: {}", ex.getMessage());
        ErrorResponse errorDetails = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                new Date(),
                ex.getMessage(),
                request.getDescription(false)
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handles method argument validation failures.
     * @param ex The exception.
     * @param request The web request.
     * @return ResponseEntity with BAD_REQUEST status and validation error details.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex, WebRequest request) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        logger.warn("Validation Error: {}", errors);
        ErrorResponse errorDetails = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                new Date(),
                "Validation Failed: " + errors,
                request.getDescription(false)
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handles 404 Not Found specifically for unmatched URLs.
     * @param ex The exception.
     * @param request The web request.
     * @return ResponseEntity with NOT_FOUND status and error details.
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandlerFoundException(NoHandlerFoundException ex, WebRequest request) {
        logger.warn("No Handler Found: {}", ex.getRequestURL());
        ErrorResponse errorDetails = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                new Date(),
                "The requested resource was not found.",
                request.getDescription(false) + " URL: " + ex.getRequestURL()
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.NOT_FOUND);
    }

    /**
     * Handles Spring Security's AccessDeniedException (403 Forbidden).
     * @param ex The exception.
     * @param request The web request.
     * @return ResponseEntity with FORBIDDEN status and error details.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        logger.warn("Access Denied: {}", ex.getMessage());
        ErrorResponse errorDetails = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                new Date(),
                "Access Denied: You do not have permission to access this resource.",
                request.getDescription(false)
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.FORBIDDEN);
    }

    /**
     * Handles all other uncaught exceptions.
     * @param ex The exception.
     * @param request The web request.
     * @return ResponseEntity with INTERNAL_SERVER_ERROR status and error details.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, WebRequest request) {
        logger.error("An unexpected error occurred: {}", ex.getMessage(), ex); // Log full stack trace for unexpected errors
        ErrorResponse errorDetails = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                new Date(),
                "An unexpected error occurred. Please try again later.",
                request.getDescription(false)
        );
        return new ResponseEntity<>(errorDetails, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```