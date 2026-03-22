package com.alx.auth.system.data.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object (DTO) for updating user profile information.
 * Fields are optional, allowing partial updates.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Request body for updating an existing user's profile")
public class UpdateUserRequest {

    @Schema(description = "New first name for the user", example = "Jonathan")
    private String firstname;

    @Schema(description = "New last name for the user", example = "Smith")
    private String lastname;

    @Size(min = 8, message = "Password must be at least 8 characters long if provided")
    @Schema(description = "New password for the user (optional, min 8 characters)", example = "NewSecureP@ss456")
    private String newPassword;
}