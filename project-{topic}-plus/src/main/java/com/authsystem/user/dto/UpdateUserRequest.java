package com.authsystem.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * DTO (Data Transfer Object) for updating an existing user.
 * This DTO allows for partial updates (PATCH) as fields are optional.
 * Validation constraints are applied where applicable.
 *
 * {@code @Data} from Lombok automatically generates getters, setters,
 * equals, hashCode, and toString methods.
 * {@code @Builder}, {@code @NoArgsConstructor}, {@code @AllArgsConstructor}
 * facilitate object creation and serialization/deserialization.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @Email(message = "Email must be a valid email address")
    @Size(max = 100, message = "Email cannot exceed 100 characters")
    private String email;

    // Password updates should typically be handled via a separate, secure flow,
    // but included here for comprehensive API example.
    @Size(min = 8, message = "Password must be at least 8 characters long")
    // @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]).{8,}$",
    //         message = "Password must contain at least one digit, one lowercase, one uppercase, and one special character")
    private String password; // Should be handled with care, e.g., current password validation

    private Boolean enabled;
    private Boolean accountNonExpired;
    private Boolean accountNonLocked;
    private Boolean credentialsNonExpired;

    private Set<String> roleNames; // Update roles by providing a set of new role names
}