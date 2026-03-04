package com.authsystem.role.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO (Data Transfer Object) for updating an existing role.
 * This DTO allows for updating the role name.
 * Validation constraints are applied.
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
public class UpdateRoleRequest {

    @NotBlank(message = "Role name is required")
    @Size(min = 3, max = 50, message = "Role name must be between 3 and 50 characters")
    private String name;
}