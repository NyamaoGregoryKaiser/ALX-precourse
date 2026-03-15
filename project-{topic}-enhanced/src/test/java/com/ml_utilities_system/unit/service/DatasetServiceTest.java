package com.ml_utilities_system.unit.service;

import com.ml_utilities_system.dto.DatasetDTO;
import com.ml_utilities_system.exception.ResourceNotFoundException;
import com.ml_utilities_system.exception.ValidationException;
import com.ml_utilities_system.model.Dataset;
import com.ml_utilities_system.repository.DatasetRepository;
import com.ml_utilities_system.service.DatasetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DatasetService Unit Tests")
class DatasetServiceTest {

    @Mock
    private DatasetRepository datasetRepository;

    @InjectMocks
    private DatasetService datasetService;

    private Dataset dataset1;
    private Dataset dataset2;
    private DatasetDTO datasetDTO1;
    private DatasetDTO datasetDTO2;

    @BeforeEach
    void setUp() {
        dataset1 = new Dataset(1L, "Dataset A", "Description A", "/path/a.csv", 1024L, "CSV",
                LocalDateTime.now().minusDays(5), LocalDateTime.now().minusDays(1));
        dataset2 = new Dataset(2L, "Dataset B", "Description B", "/path/b.json", 2048L, "JSON",
                LocalDateTime.now().minusDays(10), LocalDateTime.now().minusDays(2));

        datasetDTO1 = new DatasetDTO(1L, "Dataset A", "Description A", "/path/a.csv", 1024L, "CSV",
                LocalDateTime.now().minusDays(5), LocalDateTime.now().minusDays(1));
        datasetDTO2 = new DatasetDTO(2L, "Dataset B", "Description B", "/path/b.json", 2048L, "JSON",
                LocalDateTime.now().minusDays(10), LocalDateTime.now().minusDays(2));
    }

    @Test
    void getDatasetById_Success() {
        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));

        DatasetDTO found = datasetService.getDatasetById(1L);

        assertNotNull(found);
        assertEquals(datasetDTO1.getName(), found.getName());
        verify(datasetRepository, times(1)).findById(1L);
    }

    @Test
    void getDatasetById_NotFound() {
        when(datasetRepository.findById(3L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> datasetService.getDatasetById(3L));
        verify(datasetRepository, times(1)).findById(3L);
    }

    @Test
    void getAllDatasets_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Dataset> datasetPage = new PageImpl<>(Arrays.asList(dataset1, dataset2), pageable, 2);
        when(datasetRepository.findAll(pageable)).thenReturn(datasetPage);

        Page<DatasetDTO> foundPage = datasetService.getAllDatasets(pageable);

        assertNotNull(foundPage);
        assertEquals(2, foundPage.getTotalElements());
        assertEquals(datasetDTO1.getName(), foundPage.getContent().get(0).getName());
        verify(datasetRepository, times(1)).findAll(pageable);
    }

    @Test
    void createDataset_Success() {
        DatasetDTO newDatasetDTO = new DatasetDTO(null, "New Dataset", "New Description", "/path/new.csv", 500L, "CSV", null, null);
        Dataset newDataset = new Dataset(null, "New Dataset", "New Description", "/path/new.csv", 500L, "CSV", null, null);
        Dataset savedDataset = new Dataset(3L, "New Dataset", "New Description", "/path/new.csv", 500L, "CSV", LocalDateTime.now(), LocalDateTime.now());

        when(datasetRepository.existsByName(newDatasetDTO.getName())).thenReturn(false);
        when(datasetRepository.save(any(Dataset.class))).thenReturn(savedDataset);

        DatasetDTO created = datasetService.createDataset(newDatasetDTO);

        assertNotNull(created.getId());
        assertEquals(newDatasetDTO.getName(), created.getName());
        verify(datasetRepository, times(1)).existsByName(newDatasetDTO.getName());
        verify(datasetRepository, times(1)).save(any(Dataset.class));
    }

    @Test
    void createDataset_DuplicateName_ThrowsValidationException() {
        DatasetDTO newDatasetDTO = new DatasetDTO(null, "Dataset A", "Description", "/path/dup.csv", 100L, "CSV", null, null);
        when(datasetRepository.existsByName(newDatasetDTO.getName())).thenReturn(true);

        assertThrows(ValidationException.class, () -> datasetService.createDataset(newDatasetDTO));
        verify(datasetRepository, times(1)).existsByName(newDatasetDTO.getName());
        verify(datasetRepository, never()).save(any(Dataset.class));
    }

    @Test
    void updateDataset_Success() {
        DatasetDTO updatedDatasetDTO = new DatasetDTO(1L, "Updated Dataset A", "Updated Desc A", "/path/updated_a.csv", 1500L, "PARQUET", null, null);
        Dataset updatedEntity = new Dataset(1L, "Updated Dataset A", "Updated Desc A", "/path/updated_a.csv", 1500L, "PARQUET", dataset1.getUploadedAt(), LocalDateTime.now());

        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));
        when(datasetRepository.existsByName(updatedDatasetDTO.getName())).thenReturn(false); // No conflict with new name
        when(datasetRepository.save(any(Dataset.class))).thenReturn(updatedEntity);

        DatasetDTO updated = datasetService.updateDataset(1L, updatedDatasetDTO);

        assertNotNull(updated);
        assertEquals(updatedDatasetDTO.getName(), updated.getName());
        assertEquals(updatedDatasetDTO.getFormat(), updated.getFormat());
        verify(datasetRepository, times(1)).findById(1L);
        verify(datasetRepository, times(1)).existsByName(updatedDatasetDTO.getName());
        verify(datasetRepository, times(1)).save(any(Dataset.class));
    }

    @Test
    void updateDataset_NotFound_ThrowsResourceNotFoundException() {
        DatasetDTO updatedDatasetDTO = new DatasetDTO(3L, "Non Existent", "Desc", "/path.csv", 100L, "CSV", null, null);
        when(datasetRepository.findById(3L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> datasetService.updateDataset(3L, updatedDatasetDTO));
        verify(datasetRepository, times(1)).findById(3L);
        verify(datasetRepository, never()).existsByName(anyString());
        verify(datasetRepository, never()).save(any(Dataset.class));
    }

    @Test
    void updateDataset_DuplicateNameForDifferentDataset_ThrowsValidationException() {
        Dataset otherDataset = new Dataset(2L, "Dataset B", "Desc B", "/path/b.csv", 200L, "CSV", null, null);
        DatasetDTO updatedDatasetDTO = new DatasetDTO(1L, "Dataset B", "Updated Desc A", "/path/updated_a.csv", 1500L, "PARQUET", null, null);

        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));
        when(datasetRepository.existsByName("Dataset B")).thenReturn(true);

        assertThrows(ValidationException.class, () -> datasetService.updateDataset(1L, updatedDatasetDTO));
        verify(datasetRepository, times(1)).findById(1L);
        verify(datasetRepository, times(1)).existsByName("Dataset B");
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
    void deleteDataset_NotFound_ThrowsResourceNotFoundException() {
        when(datasetRepository.existsById(3L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> datasetService.deleteDataset(3L));
        verify(datasetRepository, times(1)).existsById(3L);
        verify(datasetRepository, never()).deleteById(anyLong());
    }
}