```java
package com.alx.pms.project.service;

import com.alx.pms.exception.ForbiddenException;
import com.alx.pms.exception.ResourceNotFoundException;
import com.alx.pms.model.Project;
import com.alx.pms.model.User;
import com.alx.pms.project.dto.ProjectRequest;
import com.alx.pms.project.dto.ProjectResponse;
import com.alx.pms.project.repository.ProjectRepository;
import com.alx.pms.user.dto.UserResponse;
import com.alx.pms.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserService userService; // Mock the UserService to avoid its dependencies

    @InjectMocks
    private ProjectService projectService;

    private User owner;
    private User otherUser;
    private Project project;
    private ProjectRequest projectRequest;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setId(1L);
        owner.setUsername("ownerUser");
        owner.setEmail("owner@example.com");

        otherUser = new User();
        otherUser.setId(2L);
        otherUser.setUsername("otherUser");

        project = new Project();
        project.setId(10L);
        project.setName("Test Project");
        project.setDescription("Description for test project");
        project.setStartDate(LocalDate.now());
        project.setEndDate(LocalDate.now().plusMonths(1));
        project.setOwner(owner);
        project.setCreatedAt(LocalDateTime.now());
        project.setUpdatedAt(LocalDateTime.now());

        projectRequest = new ProjectRequest();
        projectRequest.setName("New Project");
        projectRequest.setDescription("New project description");
        projectRequest.setStartDate(LocalDate.now());
        projectRequest.setEndDate(LocalDate.now().plusMonths(2));
    }

    @Test
    @DisplayName("Should create a new project successfully")
    void createProject_Success() {
        when(userService.findUserEntityById(owner.getId())).thenReturn(owner);
        when(projectRepository.save(any(Project.class))).thenReturn(project);
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse()); // Mock DTO conversion for owner

        ProjectResponse response = projectService.createProject(projectRequest, owner.getId());

        assertNotNull(response);
        assertEquals(project.getName(), response.getName());
        assertEquals(project.getDescription(), response.getDescription());
        verify(userService, times(1)).findUserEntityById(owner.getId());
        verify(projectRepository, times(1)).save(any(Project.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException if owner does not exist during project creation")
    void createProject_OwnerNotFound_ThrowsException() {
        when(userService.findUserEntityById(anyLong())).thenThrow(new ResourceNotFoundException("User not found"));

        assertThrows(ResourceNotFoundException.class, () -> projectService.createProject(projectRequest, 99L));
        verify(userService, times(1)).findUserEntityById(99L);
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    @DisplayName("Should get project by ID successfully when owner matches")
    void getProjectById_OwnerMatches_Success() {
        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse());

        ProjectResponse response = projectService.getProjectById(project.getId(), owner.getId());

        assertNotNull(response);
        assertEquals(project.getName(), response.getName());
        verify(projectRepository, times(1)).findById(project.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when getting non-existent project")
    void getProjectById_NotFound_ThrowsException() {
        when(projectRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> projectService.getProjectById(99L, owner.getId()));
        verify(projectRepository, times(1)).findById(99L);
    }

    @Test
    @DisplayName("Should throw ForbiddenException when getting project not owned by current user")
    void getProjectById_NotOwner_ThrowsException() {
        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));

        assertThrows(ForbiddenException.class, () -> projectService.getProjectById(project.getId(), otherUser.getId()));
        verify(projectRepository, times(1)).findById(project.getId());
    }

    @Test
    @DisplayName("Should get all projects for a specific user")
    void getAllProjectsForUser_Success() {
        when(userService.findUserEntityById(owner.getId())).thenReturn(owner);
        when(projectRepository.findByOwner(owner)).thenReturn(List.of(project));
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse());

        List<ProjectResponse> responses = projectService.getAllProjectsForUser(owner.getId());

        assertNotNull(responses);
        assertFalse(responses.isEmpty());
        assertEquals(1, responses.size());
        assertEquals(project.getName(), responses.get(0).getName());
        verify(userService, times(1)).findUserEntityById(owner.getId());
        verify(projectRepository, times(1)).findByOwner(owner);
    }

    @Test
    @DisplayName("Should update a project successfully when owner matches")
    void updateProject_OwnerMatches_Success() {
        ProjectRequest updateRequest = new ProjectRequest();
        updateRequest.setName("Updated Project Name");
        updateRequest.setDescription("Updated description");
        updateRequest.setStartDate(LocalDate.now().plusDays(1));
        updateRequest.setEndDate(LocalDate.now().plusMonths(3));

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenReturn(project); // Simulates save returning the updated entity
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse());

        ProjectResponse response = projectService.updateProject(project.getId(), updateRequest, owner.getId());

        assertNotNull(response);
        assertEquals(updateRequest.getName(), response.getName());
        assertEquals(updateRequest.getDescription(), response.getDescription());
        assertEquals(updateRequest.getStartDate(), response.getStartDate());
        assertEquals(updateRequest.getEndDate(), response.getEndDate());
        verify(projectRepository, times(1)).findById(project.getId());
        verify(projectRepository, times(1)).save(any(Project.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent project")
    void updateProject_NotFound_ThrowsException() {
        ProjectRequest updateRequest = new ProjectRequest();
        when(projectRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> projectService.updateProject(99L, updateRequest, owner.getId()));
        verify(projectRepository, times(1)).findById(99L);
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    @DisplayName("Should throw ForbiddenException when updating project not owned by current user")
    void updateProject_NotOwner_ThrowsException() {
        ProjectRequest updateRequest = new ProjectRequest();
        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));

        assertThrows(ForbiddenException.class, () -> projectService.updateProject(project.getId(), updateRequest, otherUser.getId()));
        verify(projectRepository, times(1)).findById(project.getId());
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    @DisplayName("Should delete a project successfully when owner matches")
    void deleteProject_OwnerMatches_Success() {
        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        doNothing().when(projectRepository).delete(project);

        assertDoesNotThrow(() -> projectService.deleteProject(project.getId(), owner.getId()));
        verify(projectRepository, times(1)).findById(project.getId());
        verify(projectRepository, times(1)).delete(project);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent project")
    void deleteProject_NotFound_ThrowsException() {
        when(projectRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> projectService.deleteProject(99L, owner.getId()));
        verify(projectRepository, times(1)).findById(99L);
        verify(projectRepository, never()).delete(any(Project.class));
    }

    @Test
    @DisplayName("Should throw ForbiddenException when deleting project not owned by current user")
    void deleteProject_NotOwner_ThrowsException() {
        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));

        assertThrows(ForbiddenException.class, () -> projectService.deleteProject(project.getId(), otherUser.getId()));
        verify(projectRepository, times(1)).findById(project.getId());
        verify(projectRepository, never()).delete(any(Project.class));
    }
}
```