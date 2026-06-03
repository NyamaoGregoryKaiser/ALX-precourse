```java
package com.alx.vizflow.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorDetails> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        log.warn("ResourceNotFoundException: {}", ex.getMessage());
        ErrorDetails errorDetails = new ErrorDetails(LocalDateTime.now(), ex.getMessage(), request.getDescription(false), "NOT_FOUND");
        return new ResponseEntity<>(errorDetails, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ErrorDetails> handleUserAlreadyExistsException(UserAlreadyExistsException ex, WebRequest request) {
        log.warn("UserAlreadyExistsException: {}", ex.getMessage());
        ErrorDetails errorDetails = new ErrorDetails(LocalDateTime.now(), ex.getMessage(), request.getDescription(false), "CONFLICT");
        return new ResponseEntity<>(errorDetails, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        log.warn("Validation failed: {}", errors);
        return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorDetails> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        log.warn("AccessDeniedException: {}", ex.getMessage());
        ErrorDetails errorDetails = new ErrorDetails(LocalDateTime.now(), "Access Denied: You do not have permission to access this resource.", request.getDescription(false), "FORBIDDEN");
        return new ResponseEntity<>(errorDetails, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(SecurityException.class) // Custom security exceptions, e.g., user not authorized for resource
    public ResponseEntity<ErrorDetails> handleCustomSecurityException(SecurityException ex, WebRequest request) {
        log.warn("SecurityException: {}", ex.getMessage());
        ErrorDetails errorDetails = new ErrorDetails(LocalDateTime.now(), ex.getMessage(), request.getDescription(false), "UNAUTHORIZED");
        return new ResponseEntity<>(errorDetails, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDetails> handleGlobalException(Exception ex, WebRequest request) {
        log.error("An unexpected error occurred: {}", ex.getMessage(), ex);
        ErrorDetails errorDetails = new ErrorDetails(LocalDateTime.now(), "An unexpected error occurred: " + ex.getMessage(), request.getDescription(false), "INTERNAL_SERVER_ERROR");
        return new ResponseEntity<>(errorDetails, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // DTO for consistent error response
    public record ErrorDetails(LocalDateTime timestamp, String message, String details, String errorCode) {}
}
```