```java
package com.alx.ecommerce.dto;

import com.alx.ecommerce.model.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

public class UserDTOs {

    @Getter
    @Setter
    @Builder
    public static class UserResponse {
        private UUID id;
        private String username;
        private String email;
        private String firstName;
        private String lastName;
        private User.Role role;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Setter
    public static class UpdateUserRequest {
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        private String username;

        @Email(message = "Invalid email format")
        private String email;

        private String firstName;
        private String lastName;

        // Role update only for ADMIN
        private User.Role role;
    }
}
```