```java
package com.alx.ecommerce.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AuthDTOs {

    @Getter
    @Setter
    @Builder
    public static class RegisterRequest {
        @NotBlank(message = "Username cannot be empty")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        private String username;

        @NotBlank(message = "Email cannot be empty")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password cannot be empty")
        @Size(min = 8, message = "Password must be at least 8 characters long")
        private String password;

        private String firstName;
        private String lastName;
    }

    @Getter
    @Setter
    @Builder
    public static class AuthenticationRequest {
        @NotBlank(message = "Username or Email cannot be empty")
        private String identifier; // Can be username or email

        @NotBlank(message = "Password cannot be empty")
        private String password;
    }

    @Getter
    @Setter
    @Builder
    public static class AuthenticationResponse {
        private String token;
        private String username;
        private String role;
    }
}
```