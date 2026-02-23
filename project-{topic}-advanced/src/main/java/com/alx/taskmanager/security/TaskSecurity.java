package com.alx.taskmanager.security;

import com.alx.taskmanager.model.Task;
import com.alx.taskmanager.model.UserRole;
import com.alx.taskmanager.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("taskSecurity")
@RequiredArgsConstructor
public class TaskSecurity {

    private final TaskRepository taskRepository;

    private UserDetailsImpl getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() instanceof String) {
            return null;
        }
        return (UserDetailsImpl) authentication.getPrincipal();
    }

    public boolean canAccessTask(Long taskId) {
        UserDetailsImpl currentUser = getCurrentUser();
        if (currentUser == null) return false;

        if (currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(UserRole.ROLE_ADMIN.name()))) {
            return true; // Admin can access any task
        }

        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return false;

        // User can access if they are the reporter, assignee, or assigned to the project the task belongs to
        boolean isReporter = task.getReporter() != null && task.getReporter().getId().equals(currentUser.getId());
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().getId().equals(currentUser.getId());
        boolean isProjectMember = task.getProject().getAssignedUsers().stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));

        return isReporter || isAssignee || isProjectMember;
    }

    public boolean canModifyTask(Long taskId) {
        UserDetailsImpl currentUser = getCurrentUser();
        if (currentUser == null) return false;

        if (currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(UserRole.ROLE_ADMIN.name()))) {
            return true; // Admin can modify any task
        }

        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return false;

        // User can modify if they are the reporter or assignee, or project member
        boolean isReporter = task.getReporter() != null && task.getReporter().getId().equals(currentUser.getId());
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().getId().equals(currentUser.getId());
        boolean isProjectMember = task.getProject().getAssignedUsers().stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));

        return isReporter || isAssignee || isProjectMember;
    }
}