package com.alx.ecommerce.exception;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Custom exception for authentication failures.
 * Maps to HTTP 401 Unauthorized or 400 Bad Request depending on context.
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED) // Default to Unauthorized
public class CustomAuthenticationException extends AuthenticationException {

    private HttpStatus status;
    private String message;

    public CustomAuthenticationException(String message) {
        super(message);
        this.status = HttpStatus.UNAUTHORIZED;
        this.message = message;
    }

    public CustomAuthenticationException(HttpStatus status, String message) {
        super(message);
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    @Override
    public String getMessage() {
        return message;
    }
}