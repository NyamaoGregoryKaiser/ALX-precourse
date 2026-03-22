package com.alx.auth.system.exception;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureException;
import io.jsonwebtoken.UnsupportedJwtException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler for the application.
 * This class uses Spring's @ControllerAdvice to provide centralized exception handling
 * across all @Controller classes, ensuring consistent error responses.
 *
 * @Slf4j: Lombok annotation to generate an SLF4J logger field.
 */
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    /**
     * Handles `UserNotFoundException`. Returns HTTP 404 Not Found.
     *
     * @param ex The UserNotFoundException.
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse.
     */
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFoundException(UserNotFoundException ex, WebRequest request) {
        log.warn("User not found: {}", ex.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    /**
     * Handles `DuplicateUserException`. Returns HTTP 409 Conflict.
     *
     * @param ex The DuplicateUserException.
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse.
     */
    @ExceptionHandler(DuplicateUserException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateUserException(DuplicateUserException ex, WebRequest request) {
        log.warn("Duplicate user registration attempt: {}", ex.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.getReasonPhrase(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    /**
     * Handles `InvalidCredentialsException` and `BadCredentialsException`.
     * Returns HTTP 401 Unauthorized.
     *
     * @param ex The exception (either InvalidCredentialsException or BadCredentialsException).
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse.
     */
    @ExceptionHandler({InvalidCredentialsException.class, BadCredentialsException.class})
    public ResponseEntity<ErrorResponse> handleInvalidCredentialsException(RuntimeException ex, WebRequest request) {
        log.warn("Authentication failed: {}", ex.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    /**
     * Handles `AccessDeniedException` (Spring Security). Returns HTTP 403 Forbidden.
     *
     * @param ex The AccessDeniedException.
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied for request {}: {}", request.getDescription(false), ex.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(),
                "You do not have permission to access this resource.",
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    /**
     * Handles `AuthenticationException` (general Spring Security authentication failures).
     * Returns HTTP 401 Unauthorized.
     *
     * @param ex The AuthenticationException.
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex, WebRequest request) {
        log.warn("Authentication exception: {}", ex.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                "Authentication failed: " + ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    /**
     * Handles various JWT-related exceptions. Returns HTTP 401 Unauthorized.
     *
     * @param ex The JWT exception.
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse.
     */
    @ExceptionHandler({
            SignatureException.class,
            MalformedJwtException.class,
            ExpiredJwtException.class,
            UnsupportedJwtException.class,
            IllegalArgumentException.class // for JWT related illegal argument exceptions
    })
    public ResponseEntity<ErrorResponse> handleJwtExceptions(RuntimeException ex, WebRequest request) {
        log.warn("JWT validation error: {}", ex.getMessage());
        HttpStatus status = HttpStatus.UNAUTHORIZED;
        String message = "Invalid or expired JWT token: " + ex.getMessage();

        if (ex instanceof ExpiredJwtException) {
            message = "JWT token has expired.";
        } else if (ex instanceof SignatureException) {
            message = "Invalid JWT signature.";
        } else if (ex instanceof MalformedJwtException) {
            message = "Malformed JWT token.";
        } else if (ex instanceof UnsupportedJwtException) {
            message = "Unsupported JWT token.";
        }

        ErrorResponse errorResponse = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, status);
    }


    /**
     * Handles `TooManyRequestsException`. Returns HTTP 429 Too Many Requests.
     *
     * @param ex The TooManyRequestsException.
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse.
     */
    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyRequestsException(TooManyRequestsException ex, WebRequest request) {
        log.warn("Rate limit exceeded: {}", ex.getMessage());
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.TOO_MANY_REQUESTS);
    }


    /**
     * Handles `MethodArgumentNotValidException` for validation errors in request bodies.
     * Returns HTTP 400 Bad Request with details of validation errors.
     *
     * @param ex The MethodArgumentNotValidException.
     * @param headers The HTTP headers.
     * @param status The HTTP status code.
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse with validation errors.
     */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = (error instanceof FieldError) ? ((FieldError) error).getField() : error.getObjectName();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        log.warn("Validation failed for request: {}", errors);

        String errorDetails = errors.entrySet().stream()
                .map(entry -> entry.getKey() + ": " + entry.getValue())
                .collect(Collectors.joining(", "));

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Validation failed: " + errorDetails,
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * Catches all other uncaught exceptions. Returns HTTP 500 Internal Server Error.
     * This is the fallback handler for any unexpected errors.
     *
     * @param ex The generic Exception.
     * @param request The WebRequest.
     * @return A ResponseEntity containing an ErrorResponse.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAllUncaughtException(Exception ex, WebRequest request) {
        log.error("An unexpected error occurred: {}", ex.getMessage(), ex); // Log full stack trace for unexpected errors
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "An unexpected error occurred. Please try again later.",
                request.getDescription(false),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Inner class to represent a standardized error response.
     */
    public record ErrorResponse(
            int status,
            String error,
            String message,
            String path,
            LocalDateTime timestamp
    ) {}
}