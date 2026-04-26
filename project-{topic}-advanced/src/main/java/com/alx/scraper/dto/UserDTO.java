package com.alx.scraper.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Data Transfer Object for user registration and login requests.
 * Used to encapsulate user credentials for API communication.
 *
 * ALX Focus: DTOs for clear separation of concerns between API request/response
 * and internal data models. Includes validation annotations for robust input checking.
 */
@Data
public class UserDTO {
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 255, message = "Password must be at least 6 characters")
    private String password;
}