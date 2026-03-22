package com.alx.auth.system.data.dto;

import com.alx.auth.system.data.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object (DTO) for user responses.
 * Used to return user information without sensitive data like passwords.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Response body containing public user information")
public class UserResponse {

    @Schema(description = "Unique identifier of the user", example = "1")
    private Long id;

    @Schema(description = "User's first name", example = "John")
    private String firstname;

    @Schema(description = "User's last name", example = "Doe")
    private String lastname;

    @Schema(description = "User's email address", example = "john.doe@example.com")
    private String email;

    @Schema(description = "User's assigned role", example = "USER")
    private Role role;
}