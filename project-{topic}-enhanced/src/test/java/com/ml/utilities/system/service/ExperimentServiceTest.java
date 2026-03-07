```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.ExperimentDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.model.Experiment;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.ExperimentRepository;
import com.ml.utilities.system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExperimentServiceTest {

    @Mock
    private ExperimentRepository experimentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SecurityContext securityContext;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private ExperimentService experimentService;

    private Experiment experiment;
    private ExperimentDTO experimentDTO;
    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User(100L, "testuser", "test@example.com", "password", LocalDateTime.now(), LocalDateTime.now(), Set.of(new Role("USER")));

        experiment = new Experiment(1L, "Test Experiment", "Description",
                LocalDateTime.now(), null, "PENDING", "Objective",
                LocalDateTime.now(), LocalDateTime.now(), testUser);

        experimentDTO = new ExperimentDTO(null, "New Experiment", "New Description",
                LocalDateTime.now(), null, "PENDING", "New Objective",
                null, null, null);

        // Mock SecurityContextHolder for createdBy user
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
    }

    @Test
    void createExperiment_Success() {
        when(experimentRepository.save(any(Experiment.class))).thenReturn(experiment);

        ExperimentDTO result = experimentService.createExperiment(experimentDTO);

        assertNotNull(result);
        assertEquals(experiment.getName(), result.getName());
        assertNotNull(result.getCreatedByUserId());
        verify(experimentRepository, times(1)).save(any(Experiment.class));
    }

    @Test
    void getExperimentById_Success() {
        when(experimentRepository.findById(1L)).thenReturn(Optional.of(experiment));

        Optional<ExperimentDTO> result = experimentService.getExperimentById(1L);

        assertTrue(result.isPresent());
        assertEquals(experiment.getName(), result.get().getName());
        verify(experimentRepository, times(1)).findById(1L);
    }

    @Test
    void getExperimentById_NotFound() {
        when(experimentRepository.findById(1L)).thenReturn(Optional.empty());

        Optional<ExperimentDTO> result = experimentService.getExperimentById(1L);

        assertFalse(result.isPresent());
        verify(experimentRepository, times(1)).findById(1L);
    }

    @Test
    void getAllExperiments_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        List<Experiment> experimentList = Collections.singletonList(experiment);
        Page<Experiment> experimentPage = new PageImpl<>(experimentList, pageable, experimentList.size());

        when(experimentRepository.findAll(pageable)).thenReturn(experimentPage);

        Page<ExperimentDTO> result = experimentService.getAllExperiments(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(experiment.getName(), result.getContent().get(0).getName());
        verify(experimentRepository, times(1)).findAll(pageable);
    }

    @Test
    void updateExperiment_Success() {
        ExperimentDTO updatedDTO = new ExperimentDTO(1L, "Updated Name", "Updated Desc",
                LocalDateTime.now(), LocalDateTime.now(), "COMPLETED", "Updated Obj",
                null, null, null);

        when(experimentRepository.findById(1L)).thenReturn(Optional.of(experiment));
        when(experimentRepository.save(any(Experiment.class))).thenReturn(experiment);

        ExperimentDTO result = experimentService.updateExperiment(1L, updatedDTO);

        assertNotNull(result);
        assertEquals("Updated Name", result.getName());
        assertEquals("COMPLETED", result.getStatus());
        verify(experimentRepository, times(1)).findById(1L);
        verify(experimentRepository, times(1)).save(any(Experiment.class));
    }

    @Test
    void updateExperiment_NotFound() {
        ExperimentDTO updatedDTO = new ExperimentDTO(1L, "Updated Name", "Updated Desc",
                LocalDateTime.now(), LocalDateTime.now(), "COMPLETED", "Updated Obj",
                null, null, null);
        when(experimentRepository.findById(1L)).thenReturn(Optional.empty());

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> experimentService.updateExperiment(1L, updatedDTO));

        assertEquals("Experiment not found with id: 1", thrown.getMessage());
        verify(experimentRepository, times(1)).findById(1L);
        verify(experimentRepository, never()).save(any(Experiment.class));
    }

    @Test
    void deleteExperiment_Success() {
        when(experimentRepository.existsById(1L)).thenReturn(true);
        doNothing().when(experimentRepository).deleteById(1L);

        assertDoesNotThrow(() -> experimentService.deleteExperiment(1L));

        verify(experimentRepository, times(1)).existsById(1L);
        verify(experimentRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteExperiment_NotFound() {
        when(experimentRepository.existsById(1L)).thenReturn(false);

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> experimentService.deleteExperiment(1L));

        assertEquals("Experiment not found with id: 1", thrown.getMessage());
        verify(experimentRepository, times(1)).existsById(1L);
        verify(experimentRepository, never()).deleteById(anyLong());
    }
}
```