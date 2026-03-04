package com.authsystem.common.util;

/**
 * Enum to represent standard roles in the system.
 * Using an enum for role names helps prevent typos and ensures consistency
 * when referring to roles programmatically, especially in security configurations
 * and when assigning roles to users.
 *
 * Each enum constant corresponds to a role name that should be stored in the database.
 * Conventionally, Spring Security roles are prefixed with "ROLE_".
 */
public enum RoleEnum {
    ROLE_USER("ROLE_USER"),
    ROLE_ADMIN("ROLE_ADMIN");

    private final String roleName;

    /**
     * Constructor for the RoleEnum.
     *
     * @param roleName The string representation of the role name.
     */
    RoleEnum(String roleName) {
        this.roleName = roleName;
    }

    /**
     * Returns the string representation of the role name.
     *
     * @return The role name as a string (e.g., "ROLE_USER").
     */
    public String getRoleName() {
        return roleName;
    }
}