```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.DatasetDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.DatasetRepository;
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
class DatasetServiceTest {

    @Mock
    private DatasetRepository datasetRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SecurityContext securityContext;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private DatasetService datasetService;

    private Dataset dataset;
    private DatasetDTO datasetDTO;
    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User(100L, "testuser", "test@example.com", "password", LocalDateTime.now(), LocalDateTime.now(), Set.of(new Role("USER")));

        dataset = new Dataset(1L, "Test Dataset", "1.0", "s3://test-bucket/test.csv",
                "Description", 100L, 1000L, "CSV",
                LocalDateTime.now(), LocalDateTime.now(), testUser);

        datasetDTO = new DatasetDTO(null, "New Dataset", "1.1", "s3://new-bucket/new.csv",
                "New Description", 150L, 1500L, "Parquet",
                null, null, null);

        // Mock SecurityContextHolder for createdBy user
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
    }

    @Test
    void createDataset_Success() {
        when(datasetRepository.save(any(Dataset.class))).thenReturn(dataset);

        DatasetDTO result = datasetService.createDataset(datasetDTO);

        assertNotNull(result);
        assertEquals(dataset.getName(), result.getName());
        assertEquals(dataset.getVersion(), result.getVersion());
        assertNotNull(result.getCreatedByUserId());
        verify(datasetRepository, times(1)).save(any(Dataset.class));
    }

    @Test
    void getDatasetById_Success() {
        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset));

        Optional<DatasetDTO> result = datasetService.getDatasetById(1L);

        assertTrue(result.isPresent());
        assertEquals(dataset.getName(), result.get().getName());
        verify(datasetRepository, times(1)).findById(1L);
    }

    @Test
    void getDatasetById_NotFound() {
        when(datasetRepository.findById(1L)).thenReturn(Optional.empty());

        Optional<DatasetDTO> result = datasetService.getDatasetById(1L);

        assertFalse(result.isPresent());
        verify(datasetRepository, times(1)).findById(1L);
    }

    @Test
    void getAllDatasets_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        List<Dataset> datasetList = Collections.singletonList(dataset);
        Page<Dataset> datasetPage = new PageImpl<>(datasetList, pageable, datasetList.size());

        when(datasetRepository.findAll(pageable)).thenReturn(datasetPage);

        Page<DatasetDTO> result = datasetService.getAllDatasets(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(dataset.getName(), result.getContent().get(0).getName());
        verify(datasetRepository, times(1)).findAll(pageable);
    }

    @Test
    void updateDataset_Success() {
        DatasetDTO updatedDTO = new DatasetDTO(1L, "Updated Dataset", "1.2",
                "s3://updated-bucket/data.parquet", "Updated Description", 200L, 2000L, "Parquet",
                null, null, null);

        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset));
        when(datasetRepository.save(any(Dataset.class))).thenReturn(dataset);

        DatasetDTO result = datasetService.updateDataset(1L, updatedDTO);

        assertNotNull(result);
        assertEquals("Updated Dataset", result.getName());
        assertEquals("1.2", result.getVersion());
        assertEquals("Parquet", result.getFormat());
        verify(datasetRepository, times(1)).findById(1L);
        verify(datasetRepository, times(1)).save(any(Dataset.class));
    }

    @Test
    void updateDataset_NotFound() {
        DatasetDTO updatedDTO = new DatasetDTO(1L, "Updated Dataset", "1.2",
                "s3://updated-bucket/data.parquet", "Updated Description", 200L, 2000L, "Parquet",
                null, null, null);
        when(datasetRepository.findById(1L)).thenReturn(Optional.empty());

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> datasetService.updateDataset(1L, updatedDTO));

        assertEquals("Dataset not found with id: 1", thrown.getMessage());
        verify(datasetRepository, times(1)).findById(1L);
        verify(datasetRepository, never()).save(any(Dataset.class));
    }

    @Test
    void deleteDataset_Success() {
        when(datasetRepository.existsById(1L)).thenReturn(true);
        doNothing().when(datasetRepository).deleteById(1L);

        assertDoesNotThrow(() -> datasetService.deleteDataset(1L));

        verify(datasetRepository, times(1)).existsById(1L);
        verify(datasetRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteDataset_NotFound() {
        when(datasetRepository.existsById(1L)).thenReturn(false);

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> datasetService.deleteDataset(1L));

        assertEquals("Dataset not found with id: 1", thrown.getMessage());
        verify(datasetRepository, times(1)).existsById(1L);
        verify(datasetRepository, never()).deleteById(anyLong());
    }
}
```