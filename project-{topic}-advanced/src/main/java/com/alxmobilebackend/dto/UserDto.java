```java
package com.alxmobilebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.alxmobilebackend.model.Role;
import static com.alxmobilebackend.util.Constants.*;

import java.time.LocalDateTime;
import java.util.Set;

public class UserDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserResponse {
        private Long id;
        private String username;
        private String email;
        private Set<Role> roles;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserCreateRequest {
        @NotBlank(message = NOT_BLANK_MESSAGE)
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        private String username;

        @NotBlank(message = NOT_BLANK_MESSAGE)
        @Email(message = VALID_EMAIL_MESSAGE)
        @Size(max = 100, message = "Email cannot exceed 100 characters")
        private String email;

        @NotBlank(message = NOT_BLANK_MESSAGE)
        @Size(min = 6, max = 20, message = PASSWORD_SIZE_MESSAGE)
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserUpdateRequest {
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        private String username;

        @Email(message = VALID_EMAIL_MESSAGE)
        @Size(max = 100, message = "Email cannot exceed 100 characters")
        private String email;
    }
}
```