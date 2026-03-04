package com.authsystem.role.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO (Data Transfer Object) for Role data.
 * This class is used to expose role information to the client.
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
public class RoleDto {
    private Long id;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Factory method to create a RoleDto from a {@link com.authsystem.model.Role} entity.
     * This method maps the entity fields to the DTO.
     *
     * @param role The {@link com.authsystem.model.Role} entity to convert.
     * @return A new {@link RoleDto} instance.
     */
    public static RoleDto fromEntity(com.authsystem.model.Role role) {
        return RoleDto.builder()
                .id(role.getId())
                .name(role.getName())
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }
}