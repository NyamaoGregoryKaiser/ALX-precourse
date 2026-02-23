package com.alx.taskmanager.util;

import com.alx.taskmanager.dto.ProjectDTO;
import com.alx.taskmanager.dto.TaskDTO;
import com.alx.taskmanager.dto.UserDTO;
import com.alx.taskmanager.model.Project;
import com.alx.taskmanager.model.Task;
import com.alx.taskmanager.model.User;
import com.alx.taskmanager.model.UserRole;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.stream.Collectors;

@Component
public class MapperUtil {

    public UserDTO toUserDTO(User user) {
        if (user == null) return null;
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        if (user.getRoles() != null) {
            dto.setRoles(user.getRoles().stream()
                    .map(role -> role.getName())
                    .collect(Collectors.toSet()));
        }
        return dto;
    }

    public ProjectDTO toProjectDTO(Project project) {
        if (project == null) return null;
        ProjectDTO dto = new ProjectDTO();
        dto.setId(project.getId());
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setCreatedAt(project.getCreatedAt());
        dto.setUpdatedAt(project.getUpdatedAt());
        if (project.getAssignedUsers() != null) {
            dto.setAssignedUsers(project.getAssignedUsers().stream()
                    .map(this::toUserDTO)
                    .collect(Collectors.toSet()));
            dto.setAssignedUserIds(project.getAssignedUsers().stream()
                    .map(User::getId)
                    .collect(Collectors.toSet()));
        }
        return dto;
    }

    public TaskDTO toTaskDTO(Task task) {
        if (task == null) return null;
        TaskDTO dto = new TaskDTO();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setStatus(task.getStatus());
        dto.setPriority(task.getPriority());
        dto.setDueDate(task.getDueDate());
        dto.setCreatedAt(task.getCreatedAt());
        dto.setUpdatedAt(task.getUpdatedAt());

        if (task.getProject() != null) {
            dto.setProjectId(task.getProject().getId());
            dto.setProjectName(task.getProject().getName());
        }
        if (task.getAssignee() != null) {
            dto.setAssigneeId(task.getAssignee().getId());
            dto.setAssigneeUsername(task.getAssignee().getUsername());
        }
        if (task.getReporter() != null) {
            dto.setReporterId(task.getReporter().getId());
            dto.setReporterUsername(task.getReporter().getUsername());
        }
        return dto;
    }
}