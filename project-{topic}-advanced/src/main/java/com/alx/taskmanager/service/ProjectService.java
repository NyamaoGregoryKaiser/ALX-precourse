package com.alx.taskmanager.service;

import com.alx.taskmanager.dto.ProjectDTO;
import com.alx.taskmanager.dto.UserDTO;
import com.alx.taskmanager.exception.ResourceNotFoundException;
import com.alx.taskmanager.model.Project;
import com.alx.taskmanager.model.User;
import com.alx.taskmanager.repository.ProjectRepository;
import com.alx.taskmanager.repository.UserRepository;
import com.alx.taskmanager.util.MapperUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final MapperUtil mapperUtil;

    @Transactional
    public ProjectDTO createProject(ProjectDTO projectDTO) {
        Project project = new Project();
        project.setName(projectDTO.getName());
        project.setDescription(projectDTO.getDescription());

        // Assign users if provided
        if (projectDTO.getAssignedUserIds() != null && !projectDTO.getAssignedUserIds().isEmpty()) {
            Set<User> assignedUsers = projectDTO.getAssignedUserIds().stream()
                    .map(userId -> userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId)))
                    .collect(Collectors.toSet());
            project.setAssignedUsers(assignedUsers);
        }

        return mapperUtil.toProjectDTO(projectRepository.save(project));
    }

    @Cacheable(value = "projects", key = "#id")
    @Transactional(readOnly = true)
    public ProjectDTO getProjectById(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        return mapperUtil.toProjectDTO(project);
    }

    @Cacheable(value = "projects")
    @Transactional(readOnly = true)
    public List<ProjectDTO> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(mapperUtil::toProjectDTO)
                .collect(Collectors.toList());
    }

    @CachePut(value = "projects", key = "#id")
    @Transactional
    public ProjectDTO updateProject(Long id, ProjectDTO projectDTO) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));

        project.setName(projectDTO.getName());
        project.setDescription(projectDTO.getDescription());

        // Update assigned users
        if (projectDTO.getAssignedUserIds() != null) {
            Set<User> updatedAssignedUsers = projectDTO.getAssignedUserIds().stream()
                    .map(userId -> userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId)))
                    .collect(Collectors.toSet());
            project.setAssignedUsers(updatedAssignedUsers);
        } else {
            project.getAssignedUsers().clear(); // If assignedUserIds is null, clear all assignments
        }

        return mapperUtil.toProjectDTO(projectRepository.save(project));
    }

    @CacheEvict(value = "projects", key = "#id")
    @Transactional
    public void deleteProject(Long id) {
        if (!projectRepository.existsById(id)) {
            throw new ResourceNotFoundException("Project not found with id: " + id);
        }
        projectRepository.deleteById(id);
    }

    @Transactional
    public ProjectDTO assignUsersToProject(Long projectId, Set<Long> userIds) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        Set<User> usersToAssign = userIds.stream()
                .map(userId -> userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId)))
                .collect(Collectors.toSet());

        project.getAssignedUsers().addAll(usersToAssign);
        return mapperUtil.toProjectDTO(projectRepository.save(project));
    }

    @Transactional
    public ProjectDTO removeUsersFromProject(Long projectId, Set<Long> userIds) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        project.getAssignedUsers().removeIf(user -> userIds.contains(user.getId()));
        return mapperUtil.toProjectDTO(projectRepository.save(project));
    }
}