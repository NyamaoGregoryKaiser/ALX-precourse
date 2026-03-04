package com.authsystem.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

/**
 * A standardized response structure for all API endpoints.
 * This DTO (Data Transfer Object) ensures consistent JSON responses
 * for both success and error scenarios across the application.
 *
 * {@code @JsonInclude(JsonInclude.Include.NON_NULL)} ensures that fields with null values
 * are not included in the JSON output, making responses cleaner.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL) // Only include non-null fields in JSON output
public class ApiResponse<T> {

    private int status;
    private String message;
    private String errorCode; // Custom error code for specific error types
    private String path;      // The request path that triggered the response
    private LocalDateTime timestamp;
    private T data;           // The actual response data for success cases
    private Object errors;    // Details about errors, typically for validation failures

    /**
     * Private constructor to ensure instantiation via static factory methods.
     */
    private ApiResponse(int status, String message, String errorCode, T data, Object errors, String path) {
        this.status = status;
        this.message = message;
        this.errorCode = errorCode;
        this.data = data;
        this.errors = errors;
        this.path = path;
        this.timestamp = LocalDateTime.now();
    }

    /**
     * Static factory method for creating a successful API response.
     *
     * @param status The HTTP status code (e.g., 200, 201).
     * @param message A descriptive message about the operation's success.
     * @param data The payload of the response.
     * @param path The request path.
     * @param <T> The type of the data payload.
     * @return A new {@link ApiResponse} instance representing success.
     */
    public static <T> ApiResponse<T> success(int status, String message, T data, String path) {
        return new ApiResponse<>(status, message, null, data, null, path);
    }

    /**
     * Static factory method for creating a successful API response with default 200 OK status.
     *
     * @param message A descriptive message about the operation's success.
     * @param data The payload of the response.
     * @param path The request path.
     * @param <T> The type of the data payload.
     * @return A new {@link ApiResponse} instance representing success.
     */
    public static <T> ApiResponse<T> success(String message, T data, String path) {
        return success(HttpStatus.OK.value(), message, data, path);
    }

    /**
     * Static factory method for creating an error API response.
     *
     * @param status The HTTP status code (e.g., 400, 401, 404, 500).
     * @param message A descriptive error message.
     * @param errorCode A custom application-specific error code.
     * @param errors Detailed error information (e.g., a map of validation errors).
     * @param path The request path.
     * @param <T> The type of the data payload (will be null for error responses).
     * @return A new {@link ApiResponse} instance representing an error.
     */
    public static <T> ApiResponse<T> error(int status, String message, String errorCode, Object errors, String path) {
        return new ApiResponse<>(status, message, errorCode, null, errors, path);
    }

    /**
     * Static factory method for creating an error API response with default 500 Internal Server Error status.
     *
     * @param message A descriptive error message.
     * @param errorCode A custom application-specific error code.
     * @param path The request path.
     * @param <T> The type of the data payload.
     * @return A new {@link ApiResponse} instance representing an error.
     */
    public static <T> ApiResponse<T> error(String message, String errorCode, String path) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR.value(), message, errorCode, null, path);
    }
}