package com.alx.taskmanager.service;

import com.alx.taskmanager.dto.ProjectDTO;
import com.alx.taskmanager.exception.ResourceNotFoundException;
import com.alx.taskmanager.model.Project;
import com.alx.taskmanager.model.User;
import com.alx.taskmanager.repository.ProjectRepository;
import com.alx.taskmanager.repository.UserRepository;
import com.alx.taskmanager.util.MapperUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MapperUtil mapperUtil;

    @InjectMocks
    private ProjectService projectService;

    private Project project;
    private ProjectDTO projectDTO;
    private User user;

    @BeforeEach
    void setUp() {
        user = new User(1L, "testuser", "password", "test@example.com", new HashSet<>(), new HashSet<>(), new HashSet<>());
        project = new Project(1L, "Test Project", "Description", null, null, new HashSet<>(), new HashSet<>(Collections.singleton(user)));
        projectDTO = new ProjectDTO();
        projectDTO.setId(1L);
        projectDTO.setName("Test Project");
        projectDTO.setDescription("Description");
        projectDTO.setAssignedUserIds(Collections.singleton(1L));
    }

    @Test
    void createProject_ValidProjectDTO_ReturnsCreatedProjectDTO() {
        ProjectDTO createRequest = new ProjectDTO();
        createRequest.setName("New Project");
        createRequest.setDescription("New Description");
        createRequest.setAssignedUserIds(Collections.singleton(1L));

        Project newProject = new Project(2L, "New Project", "New Description", null, null, new HashSet<>(), new HashSet<>(Collections.singleton(user)));
        ProjectDTO createdDTO = new ProjectDTO();
        createdDTO.setId(2L);
        createdDTO.setName("New Project");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(projectRepository.save(any(Project.class))).thenReturn(newProject);
        when(mapperUtil.toProjectDTO(newProject)).thenReturn(createdDTO);

        ProjectDTO result = projectService.createProject(createRequest);

        assertNotNull(result);
        assertEquals("New Project", result.getName());
        verify(userRepository, times(1)).findById(1L);
        verify(projectRepository, times(1)).save(any(Project.class));
        verify(mapperUtil, times(1)).toProjectDTO(newProject);
    }

    @Test
    void getProjectById_ExistingProject_ReturnsProjectDTO() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(mapperUtil.toProjectDTO(project)).thenReturn(projectDTO);

        ProjectDTO foundProject = projectService.getProjectById(1L);

        assertNotNull(foundProject);
        assertEquals(project.getName(), foundProject.getName());
        verify(projectRepository, times(1)).findById(1L);
        verify(mapperUtil, times(1)).toProjectDTO(project);
    }

    @Test
    void getProjectById_NonExistingProject_ThrowsResourceNotFoundException() {
        when(projectRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> projectService.getProjectById(2L));
        verify(projectRepository, times(1)).findById(2L);
        verify(mapperUtil, never()).toProjectDTO(any());
    }

    @Test
    void getAllProjects_ReturnsListOfProjectDTOs() {
        Project project2 = new Project(2L, "Project 2", "Desc 2", null, null, new HashSet<>(), new HashSet<>());
        ProjectDTO projectDTO2 = new ProjectDTO();
        projectDTO2.setId(2L);
        projectDTO2.setName("Project 2");

        when(projectRepository.findAll()).thenReturn(List.of(project, project2));
        when(mapperUtil.toProjectDTO(project)).thenReturn(projectDTO);
        when(mapperUtil.toProjectDTO(project2)).thenReturn(projectDTO2);

        List<ProjectDTO> projects = projectService.getAllProjects();

        assertNotNull(projects);
        assertEquals(2, projects.size());
        assertEquals(projectDTO.getName(), projects.get(0).getName());
        assertEquals(projectDTO2.getName(), projects.get(1).getName());
        verify(projectRepository, times(1)).findAll();
        verify(mapperUtil, times(2)).toProjectDTO(any(Project.class));
    }

    @Test
    void updateProject_ExistingProject_ReturnsUpdatedProjectDTO() {
        ProjectDTO updateRequest = new ProjectDTO();
        updateRequest.setName("Updated Project Name");
        updateRequest.setDescription("Updated Description");
        updateRequest.setAssignedUserIds(Set.of(1L)); // Assign to existing user

        Project updatedProjectEntity = new Project(1L, "Updated Project Name", "Updated Description", null, null, new HashSet<>(), new HashSet<>(Collections.singleton(user)));
        ProjectDTO updatedProjectDTO = new ProjectDTO();
        updatedProjectDTO.setId(1L);
        updatedProjectDTO.setName("Updated Project Name");

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(projectRepository.save(any(Project.class))).thenReturn(updatedProjectEntity);
        when(mapperUtil.toProjectDTO(updatedProjectEntity)).thenReturn(updatedProjectDTO);

        ProjectDTO result = projectService.updateProject(1L, updateRequest);

        assertNotNull(result);
        assertEquals("Updated Project Name", result.getName());
        assertEquals("Updated Description", project.getDescription()); // Verify entity modification
        verify(projectRepository, times(1)).findById(1L);
        verify(projectRepository, times(1)).save(project);
        verify(mapperUtil, times(1)).toProjectDTO(updatedProjectEntity);
    }

    @Test
    void updateProject_NonExistingProject_ThrowsResourceNotFoundException() {
        ProjectDTO updateRequest = new ProjectDTO();
        when(projectRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> projectService.updateProject(2L, updateRequest));
        verify(projectRepository, times(1)).findById(2L);
        verify(projectRepository, never()).save(any(Project.class));
        verify(mapperUtil, never()).toProjectDTO(any());
    }

    @Test
    void deleteProject_ExistingProject_DeletesProject() {
        when(projectRepository.existsById(1L)).thenReturn(true);
        doNothing().when(projectRepository).deleteById(1L);

        projectService.deleteProject(1L);

        verify(projectRepository, times(1)).existsById(1L);
        verify(projectRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteProject_NonExistingProject_ThrowsResourceNotFoundException() {
        when(projectRepository.existsById(2L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> projectService.deleteProject(2L));
        verify(projectRepository, times(1)).existsById(2L);
        verify(projectRepository, never()).deleteById(anyLong());
    }

    @Test
    void assignUsersToProject_ExistingProjectAndUsers_ReturnsUpdatedProjectDTO() {
        User user2 = new User(2L, "user2", "pass", "user2@mail.com", new HashSet<>(), new HashSet<>(), new HashSet<>());
        Set<Long> userIdsToAssign = Set.of(2L);

        Project updatedProjectEntity = new Project(1L, "Test Project", "Description", null, null, new HashSet<>(), new HashSet<>(Set.of(user, user2)));
        ProjectDTO updatedProjectDTO = new ProjectDTO();
        updatedProjectDTO.setId(1L);
        updatedProjectDTO.setAssignedUserIds(Set.of(1L, 2L));

        when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user2));
        when(projectRepository.save(any(Project.class))).thenReturn(updatedProjectEntity);
        when(mapperUtil.toProjectDTO(updatedProjectEntity)).thenReturn(updatedProjectDTO);

        ProjectDTO result = projectService.assignUsersToProject(1L, userIdsToAssign);

        assertNotNull(result);
        assertTrue(result.getAssignedUserIds().contains(1L));
        assertTrue(result.getAssignedUserIds().contains(2L));
        verify(projectRepository, times(1)).findById(1L);
        verify(userRepository, times(1)).findById(2L);
        verify(projectRepository, times(1)).save(project);
    }
}