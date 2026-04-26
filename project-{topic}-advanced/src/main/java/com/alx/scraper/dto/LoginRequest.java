package com.alx.scraper.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Data Transfer Object for user login requests.
 * Simplified for login, only requiring username and password.
 *
 * ALX Focus: Specific DTOs for different API operations, improving clarity
 * and ensuring only necessary data is transferred and validated.
 */
@Data
public class LoginRequest {
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;
}