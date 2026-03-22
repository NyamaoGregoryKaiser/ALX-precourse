package com.alx.auth.system.data.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object (DTO) for user registration requests.
 * Used when a new user attempts to sign up.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Request body for new user registration")
public class RegisterRequest {

    @NotBlank(message = "First name cannot be empty")
    @Schema(description = "User's first name", example = "John", required = true)
    private String firstname;

    @NotBlank(message = "Last name cannot be empty")
    @Schema(description = "User's last name", example = "Doe", required = true)
    private String lastname;

    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Email must be a valid email address")
    @Schema(description = "User's email address (must be unique)", example = "john.doe@example.com", required = true)
    private String email;

    @NotBlank(message = "Password cannot be empty")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    @Schema(description = "User's chosen password (min 8 characters)", example = "SecureP@ss123", required = true)
    private String password;
}