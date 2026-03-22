package com.alx.auth.system.data.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object (DTO) for user authentication requests.
 * Used when a user attempts to log in.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Request body for user authentication (login)")
public class AuthenticationRequest {

    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Email must be a valid email address")
    @Schema(description = "User's email address", example = "john.doe@example.com", required = true)
    private String email;

    @NotBlank(message = "Password cannot be empty")
    @Schema(description = "User's password", example = "password123", required = true)
    private String password;
}