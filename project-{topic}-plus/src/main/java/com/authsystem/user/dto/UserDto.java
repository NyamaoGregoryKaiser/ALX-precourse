package com.authsystem.user.dto;

import com.authsystem.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * DTO (Data Transfer Object) for User data.
 * This class is used to expose user information to the client,
 * excluding sensitive data like the password.
 * It includes user details and their associated roles.
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
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private boolean enabled;
    private Set<String> roles; // Only expose role names
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Factory method to create a UserDto from a {@link com.authsystem.model.User} entity.
     * This method maps the entity fields to the DTO, converting the Set of Role objects
     * to a Set of role names (Strings) to prevent exposing the full Role entity.
     *
     * @param user The {@link com.authsystem.model.User} entity to convert.
     * @return A new {@link UserDto} instance.
     */
    public static UserDto fromEntity(com.authsystem.model.User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .enabled(user.isEnabled())
                .roles(roleNames)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}