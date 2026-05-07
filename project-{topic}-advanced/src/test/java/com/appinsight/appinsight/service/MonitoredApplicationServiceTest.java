package com.appinsight.appinsight.service;

import com.appinsight.appinsight.dto.MonitoredApplicationDTO;
import com.appinsight.appinsight.exception.ResourceNotFoundException;
import com.appinsight.appinsight.model.MonitoredApplication;
import com.appinsight.appinsight.repository.MonitoredApplicationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonitoredApplicationServiceTest {

    @Mock
    private MonitoredApplicationRepository applicationRepository;

    @InjectMocks
    private MonitoredApplicationService applicationService;

    private MonitoredApplication app1;
    private MonitoredApplication app2;
    private MonitoredApplicationDTO app1DTO;
    private MonitoredApplicationDTO app2DTO;

    @BeforeEach
    void setUp() {
        app1 = MonitoredApplication.builder()
                .id(1L).name("TestApp1").description("Description 1").apiKey("key1")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        app2 = MonitoredApplication.builder()
                .id(2L).name("TestApp2").description("Description 2").apiKey("key2")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();

        app1DTO = MonitoredApplicationDTO.builder()
                .id(1L).name("TestApp1").description("Description 1").apiKey("key1")
                .createdAt(app1.getCreatedAt()).updatedAt(app1.getUpdatedAt()).build();
        app2DTO = MonitoredApplicationDTO.builder()
                .id(2L).name("TestApp2").description("Description 2").apiKey("key2")
                .createdAt(app2.getCreatedAt()).updatedAt(app2.getUpdatedAt()).build();
    }

    @Test
    @DisplayName("Should return all applications")
    void getAllApplications_shouldReturnAllApplications() {
        when(applicationRepository.findAll()).thenReturn(Arrays.asList(app1, app2));

        List<MonitoredApplicationDTO> result = applicationService.getAllApplications();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("TestApp1");
        assertThat(result.get(1).getName()).isEqualTo("TestApp2");
        verify(applicationRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should return application by ID")
    void getApplicationById_shouldReturnApplication_whenFound() {
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(app1));

        MonitoredApplicationDTO result = applicationService.getApplicationById(1L);

        assertThat(result.getName()).isEqualTo("TestApp1");
        verify(applicationRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when application not found by ID")
    void getApplicationById_shouldThrowNotFound_whenNotFound() {
        when(applicationRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> applicationService.getApplicationById(99L));
        verify(applicationRepository, times(1)).findById(99L);
    }

    @Test
    @DisplayName("Should create a new application")
    void createApplication_shouldCreateNewApplication() {
        MonitoredApplication newApp = MonitoredApplication.builder().name("NewApp").description("New Desc").build();
        MonitoredApplicationDTO newAppDTO = MonitoredApplicationDTO.builder().name("NewApp").description("New Desc").build();
        when(applicationRepository.existsByName("NewApp")).thenReturn(false);
        when(applicationRepository.save(any(MonitoredApplication.class))).thenReturn(newApp); // Return the entity with generated ID/API key

        MonitoredApplicationDTO created = applicationService.createApplication(newAppDTO);

        assertThat(created.getName()).isEqualTo("NewApp");
        assertThat(created.getApiKey()).isNotNull(); // API key should be generated
        verify(applicationRepository, times(1)).existsByName("NewApp");
        verify(applicationRepository, times(1)).save(any(MonitoredApplication.class));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when creating application with existing name")
    void createApplication_shouldThrowIllegalArgument_whenNameExists() {
        MonitoredApplicationDTO newAppDTO = MonitoredApplicationDTO.builder().name("TestApp1").description("New Desc").build();
        when(applicationRepository.existsByName("TestApp1")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> applicationService.createApplication(newAppDTO));
        verify(applicationRepository, times(1)).existsByName("TestApp1");
        verify(applicationRepository, never()).save(any(MonitoredApplication.class));
    }

    @Test
    @DisplayName("Should update an existing application")
    void updateApplication_shouldUpdateExistingApplication() {
        MonitoredApplication updatedEntity = MonitoredApplication.builder()
                .id(1L).name("UpdatedApp").description("Updated Desc").apiKey("key1")
                .createdAt(app1.getCreatedAt()).updatedAt(LocalDateTime.now()).build();
        MonitoredApplicationDTO updateDTO = MonitoredApplicationDTO.builder()
                .name("UpdatedApp").description("Updated Desc").build();

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(app1));
        when(applicationRepository.existsByName("UpdatedApp")).thenReturn(false); // No name conflict
        when(applicationRepository.save(any(MonitoredApplication.class))).thenReturn(updatedEntity);

        MonitoredApplicationDTO result = applicationService.updateApplication(1L, updateDTO);

        assertThat(result.getName()).isEqualTo("UpdatedApp");
        assertThat(result.getDescription()).isEqualTo("Updated Desc");
        verify(applicationRepository, times(1)).findById(1L);
        verify(applicationRepository, times(1)).save(any(MonitoredApplication.class));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when updating application to an existing name")
    void updateApplication_shouldThrowIllegalArgument_whenNewNameExists() {
        MonitoredApplicationDTO updateDTO = MonitoredApplicationDTO.builder()
                .name("TestApp2").description("Updated Desc").build(); // Try to change name to an existing one

        when(applicationRepository.findById(1L)).thenReturn(Optional.of(app1));
        when(applicationRepository.existsByName("TestApp2")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> applicationService.updateApplication(1L, updateDTO));
        verify(applicationRepository, times(1)).findById(1L);
        verify(applicationRepository, times(1)).existsByName("TestApp2");
        verify(applicationRepository, never()).save(any(MonitoredApplication.class));
    }

    @Test
    @DisplayName("Should delete an application by ID")
    void deleteApplication_shouldDeleteApplication_whenFound() {
        when(applicationRepository.existsById(1L)).thenReturn(true);
        doNothing().when(applicationRepository).deleteById(1L);

        applicationService.deleteApplication(1L);

        verify(applicationRepository, times(1)).existsById(1L);
        verify(applicationRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent application")
    void deleteApplication_shouldThrowNotFound_whenNotFound() {
        when(applicationRepository.existsById(anyLong())).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> applicationService.deleteApplication(99L));
        verify(applicationRepository, times(1)).existsById(99L);
        verify(applicationRepository, never()).deleteById(anyLong());
    }
}