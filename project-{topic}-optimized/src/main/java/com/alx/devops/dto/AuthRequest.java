package com.alx.devops.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for authentication requests (login/registration).
 * Includes fields for username, email (optional for login), and password.
 */
@Data
public class AuthRequest {
    @NotBlank(message = "Username cannot be empty")
    private String username;
    private String email; // Optional for login, required for registration
    @NotBlank(message = "Password cannot be empty")
    private String password;
}