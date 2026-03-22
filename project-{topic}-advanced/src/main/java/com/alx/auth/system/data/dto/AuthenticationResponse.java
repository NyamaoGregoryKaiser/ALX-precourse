package com.alx.auth.system.data.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object (DTO) for authentication responses.
 * Contains the JWT token issued upon successful registration or login.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Response body for user authentication, containing the JWT token")
public class AuthenticationResponse {

    @Schema(description = "JWT authentication token", example = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsImlhdCI6MTY3ODkzNDY5MCwiZXhwIjoxNjc4OTM4MjkwfQ.signature")
    private String token;

    @Schema(description = "Type of token", example = "Bearer")
    private String tokenType = "Bearer"; // Default to Bearer
}