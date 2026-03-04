package com.authsystem.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO (Data Transfer Object) for user authentication (login) requests.
 * This class encapsulates the credentials (username/email and password)
 * provided by a user attempting to log in.
 *
 * Validation constraints ensure that the required fields are present.
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
public class AuthRequest {

    @NotBlank(message = "Username or email is required")
    private String username; // Can be username or email

    @NotBlank(message = "Password is required")
    private String password;
}