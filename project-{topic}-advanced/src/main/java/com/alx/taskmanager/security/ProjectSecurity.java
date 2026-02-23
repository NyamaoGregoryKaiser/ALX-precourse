package com.alx.taskmanager.security;

import com.alx.taskmanager.model.Project;
import com.alx.taskmanager.model.UserRole;
import com.alx.taskmanager.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("projectSecurity")
@RequiredArgsConstructor
public class ProjectSecurity {

    private final ProjectRepository projectRepository;

    private UserDetailsImpl getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() instanceof String) {
            return null;
        }
        return (UserDetailsImpl) authentication.getPrincipal();
    }

    public boolean canAccessProject(Long projectId) {
        UserDetailsImpl currentUser = getCurrentUser();
        if (currentUser == null) return false;

        if (currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(UserRole.ROLE_ADMIN.name()))) {
            return true; // Admin can access any project
        }

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) return false;

        // Check if the user is assigned to the project
        return project.getAssignedUsers().stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));
    }

    public boolean canModifyProject(Long projectId) {
        UserDetailsImpl currentUser = getCurrentUser();
        if (currentUser == null) return false;

        if (currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(UserRole.ROLE_ADMIN.name()))) {
            return true; // Admin can modify any project
        }

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) return false;

        // For simplicity, let's say only admin or users assigned to the project can modify.
        // A more complex rule might be "project creator" or "project lead".
        return project.getAssignedUsers().stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));
    }

    public boolean canDeleteProject(Long projectId) {
        UserDetailsImpl currentUser = getCurrentUser();
        if (currentUser == null) return false;

        if (currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(UserRole.ROLE_ADMIN.name()))) {
            return true; // Admin can delete any project
        }
        // Currently, only ADMIN can delete. Add more rules if needed (e.g., project creator).
        return false;
    }
}