package com.alx.scraper.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for JWT authentication responses.
 * Contains the generated JWT token and the token type.
 *
 * ALX Focus: Standardized API response format for authentication results,
 * critical for stateless API security using JWT.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class JwtResponse {
    private String token;
    private String type = "Bearer";
}