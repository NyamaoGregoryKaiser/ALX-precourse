```java
package com.alx.webscraper.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.io.IOException;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler for the WebScraperX application.
 * Catches various exceptions across all controllers and provides consistent,
 * structured JSON error responses.
 */
@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles {@link ResourceNotFoundException} (HTTP 404 Not Found).
     * Occurs when a requested resource (e.g., scraping task) does not exist.
     *
     * @param ex The ResourceNotFoundException instance.
     * @param request The WebRequest.
     * @return A ResponseEntity containing error details and HTTP 404 status.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        logger.warn("Resource not found: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problemDetail.setTitle("Resource Not Found");
        problemDetail.setType(URI.create("/errors/not-found"));
        problemDetail.setProperty("timestamp", LocalDateTime.now());
        problemDetail.setProperty("path", request.getDescription(false).substring(4)); // Remove "uri=" prefix
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problemDetail);
    }

    /**
     * Handles {@link MethodArgumentNotValidException} (HTTP 400 Bad Request).
     * Occurs when `@Valid` annotation fails due to invalid request body/parameters.
     *
     * @param ex The MethodArgumentNotValidException instance.
     * @param request The WebRequest.
     * @return A ResponseEntity containing error details (field errors) and HTTP 400 status.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, WebRequest request) {
        logger.warn("Validation failed for request: {}", ex.getMessage());
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed for request.");
        problemDetail.setTitle("Invalid Arguments");
        problemDetail.setType(URI.create("/errors/invalid-arguments"));
        problemDetail.setProperty("timestamp", LocalDateTime.now());
        problemDetail.setProperty("path", request.getDescription(false).substring(4));
        problemDetail.setProperty("errors", errors); // Include detailed field errors
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problemDetail);
    }

    /**
     * Handles {@link HttpMessageNotReadableException} (HTTP 400 Bad Request).
     * Occurs when the request body is malformed JSON or has type mismatches.
     *
     * @param ex The HttpMessageNotReadableException instance.
     * @param request The WebRequest.
     * @return A ResponseEntity containing error details and HTTP 400 status.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, WebRequest request) {
        logger.warn("Malformed JSON or unreadable HTTP message: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Malformed JSON request or unreadable message body.");
        problemDetail.setTitle("Bad Request");
        problemDetail.setType(URI.create("/errors/malformed-json"));
        problemDetail.setProperty("timestamp", LocalDateTime.now());
        problemDetail.setProperty("path", request.getDescription(false).substring(4));
        problemDetail.setProperty("details", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problemDetail);
    }

    /**
     * Handles {@link BadCredentialsException} (HTTP 401 Unauthorized).
     * Occurs during authentication when username/password are incorrect.
     *
     * @param ex The BadCredentialsException instance.
     * @param request The WebRequest.
     * @return A ResponseEntity containing error details and HTTP 401 status.
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ProblemDetail> handleBadCredentialsException(BadCredentialsException ex, WebRequest request) {
        logger.warn("Authentication failed: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Invalid username or password.");
        problemDetail.setTitle("Authentication Failed");
        problemDetail.setType(URI.create("/errors/unauthorized"));
        problemDetail.setProperty("timestamp", LocalDateTime.now());
        problemDetail.setProperty("path", request.getDescription(false).substring(4));
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problemDetail);
    }

    /**
     * Handles {@link AccessDeniedException} (HTTP 403 Forbidden).
     * Occurs when an authenticated user attempts to access a resource they are not authorized for.
     *
     * @param ex The AccessDeniedException instance.
     * @param request The WebRequest.
     * @return A ResponseEntity containing error details and HTTP 403 status.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ProblemDetail> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        logger.warn("Access denied: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problemDetail.setTitle("Access Denied");
        problemDetail.setType(URI.create("/errors/forbidden"));
        problemDetail.setProperty("timestamp", LocalDateTime.now());
        problemDetail.setProperty("path", request.getDescription(false).substring(4));
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problemDetail);
    }

    /**
     * Handles {@link CustomRateLimitException} (HTTP 429 Too Many Requests).
     * Occurs when a client exceeds the defined API rate limit.
     *
     * @param ex The CustomRateLimitException instance.
     * @param request The WebRequest.
     * @return A ResponseEntity containing error details and HTTP 429 status.
     */
    @ExceptionHandler(CustomRateLimitException.class)
    public ResponseEntity<ProblemDetail> handleCustomRateLimitException(CustomRateLimitException ex, WebRequest request) {
        logger.warn("Rate limit exceeded: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage());
        problemDetail.setTitle("Too Many Requests");
        problemDetail.setType(URI.create("/errors/rate-limit-exceeded"));
        problemDetail.setProperty("timestamp", LocalDateTime.now());
        problemDetail.setProperty("path", request.getDescription(false).substring(4));
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(problemDetail);
    }

    /**
     * Handles {@link IOException} (HTTP 500 Internal Server Error).
     * Specifically for errors during web scraping (e.g., network issues, malformed response).
     *
     * @param ex The IOException instance.
     * @param request The WebRequest.
     * @return A ResponseEntity containing error details and HTTP 500 status.
     */
    @ExceptionHandler(IOException.class)
    public ResponseEntity<ProblemDetail> handleIOException(IOException ex, WebRequest request) {
        logger.error("IO Exception during request processing (e.g., scraping failure): {}", ex.getMessage(), ex);
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An error occurred during web scraping or external resource access: " + ex.getMessage());
        problemDetail.setTitle("Web Scraping Error");
        problemDetail.setType(URI.create("/errors/scraping-io-error"));
        problemDetail.setProperty("timestamp", LocalDateTime.now());
        problemDetail.setProperty("path", request.getDescription(false).substring(4));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problemDetail);
    }

    /**
     * Catches all other uncaught exceptions (HTTP 500 Internal Server Error).
     * Provides a generic error message and logs the full stack trace for debugging.
     *
     * @param ex The Exception instance.
     * @param request The WebRequest.
     * @return A ResponseEntity containing generic error details and HTTP 500 status.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGenericException(Exception ex, WebRequest request) {
        logger.error("An unexpected error occurred: {}", ex.getMessage(), ex);
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.");
        problemDetail.setTitle("Internal Server Error");
        problemDetail.setType(URI.create("/errors/internal-server-error"));
        problemDetail.setProperty("timestamp", LocalDateTime.now());
        problemDetail.setProperty("path", request.getDescription(false).substring(4));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problemDetail);
    }
}
```