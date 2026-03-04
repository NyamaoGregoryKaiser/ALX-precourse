package com.authsystem.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO (Data Transfer Object) for authentication responses.
 * This class is used to send back the JWT token to the client upon successful authentication.
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
public class AuthResponse {
    private String token;
    private String message;
}