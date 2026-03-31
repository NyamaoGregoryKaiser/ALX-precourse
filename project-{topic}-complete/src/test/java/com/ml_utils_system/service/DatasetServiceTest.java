```java
package com.ml_utils_system.service;

import com.ml_utils_system.dto.DatasetDto;
import com.ml_utils_system.exception.ResourceNotFoundException;
import com.ml_utils_system.exception.ValidationException;
import com.ml_utils_system.model.Dataset;
import com.ml_utils_system.repository.DatasetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link DatasetService} using Mockito.
 * Focuses on testing the business logic of dataset management,
 * mocking external dependencies like the repository and file system operations.
 */
@ExtendWith(MockitoExtension.class)
public class DatasetServiceTest {

    @Mock
    private DatasetRepository datasetRepository;

    @InjectMocks
    private DatasetService datasetService;

    private Dataset dataset1;
    private Dataset dataset2;
    private DatasetDto datasetDto1;
    private DatasetDto datasetDto2;

    @BeforeEach
    void setUp() {
        dataset1 = new Dataset(1L, "Iris Dataset", "Description 1", "/path/iris.csv", "CSV", 100L, 10, 4, LocalDateTime.now(), LocalDateTime.now());
        dataset2 = new Dataset(2L, "Churn Data", "Description 2", "/path/churn.json", "JSON", 200L, 20, 5, LocalDateTime.now(), LocalDateTime.now());

        datasetDto1 = new DatasetDto(1L, "Iris Dataset", "Description 1", "/path/iris.csv", "CSV", 100L, 10, 4, LocalDateTime.now(), LocalDateTime.now());
        datasetDto2 = new DatasetDto(2L, "Churn Data", "Description 2", "/path/churn.json", "JSON", 200L, 20, 5, LocalDateTime.now(), LocalDateTime.now());
    }

    @Test
    @DisplayName("Should upload dataset successfully")
    void uploadDataset_success() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", "data".getBytes());
        String name = "New Dataset";
        String description = "New Description";

        when(datasetRepository.existsByName(name)).thenReturn(false);
        when(datasetRepository.save(any(Dataset.class))).thenAnswer(invocation -> {
            Dataset ds = invocation.getArgument(0);
            ds.setId(3L); // Simulate ID generation
            return ds;
        });

        // Mock static Files.createDirectories, Files.copy, Paths.get, Files.exists
        try (MockedStatic<Files> mockedFiles = mockStatic(Files.class);
             MockedStatic<Paths> mockedPaths = mockStatic(Paths.class)) {

            Path mockUploadPath = mock(Path.class);
            Path mockFilePath = mock(Path.class);

            when(mockPaths.get(anyString())).thenReturn(mockUploadPath);
            when(mockUploadPath.resolve(anyString())).thenReturn(mockFilePath);
            when(mockedFiles.exists(mockUploadPath)).thenReturn(true);
            doNothing().when(mockedFiles).copy(any(), any(Path.class));

            DatasetDto result = datasetService.uploadDataset(file, name, description);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo(name);
            assertThat(result.getDescription()).isEqualTo(description);
            assertThat(result.getFileType()).isEqualTo("CSV");
            assertThat(result.getSizeBytes()).isEqualTo(file.getSize());
            assertThat(result.getStoragePath()).startsWith("uploads/"); // Path is generated internally

            verify(datasetRepository).existsByName(name);
            verify(datasetRepository).save(any(Dataset.class));
            verify(mockedFiles).copy(any(), any(Path.class));
        }
    }

    @Test
    @DisplayName("Should throw ValidationException if dataset name already exists during upload")
    void uploadDataset_duplicateName_throwsException() {
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", "data".getBytes());
        String name = "Iris Dataset"; // Already exists
        String description = "Description";

        when(datasetRepository.existsByName(name)).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () ->
                datasetService.uploadDataset(file, name, description));

        assertThat(exception.getMessage()).isEqualTo("Dataset with name '" + name + "' already exists.");
        verify(datasetRepository).existsByName(name);
        verify(datasetRepository, never()).save(any(Dataset.class));
    }

    @Test
    @DisplayName("Should throw ValidationException if file storage fails during upload")
    void uploadDataset_fileStorageFails_throwsException() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", "data".getBytes());
        String name = "New Dataset";
        String description = "New Description";

        when(datasetRepository.existsByName(name)).thenReturn(false);

        // Mock static Files.createDirectories, Files.copy, Paths.get, Files.exists
        try (MockedStatic<Files> mockedFiles = mockStatic(Files.class);
             MockedStatic<Paths> mockedPaths = mockStatic(Paths.class)) {

            Path mockUploadPath = mock(Path.class);
            Path mockFilePath = mock(Path.class);

            when(mockPaths.get(anyString())).thenReturn(mockUploadPath);
            when(mockUploadPath.resolve(anyString())).thenReturn(mockFilePath);
            when(mockedFiles.exists(mockUploadPath)).thenReturn(true);
            // Simulate IOException during file copy
            doThrow(new IOException("Disk full")).when(mockedFiles).copy(any(), any(Path.class));

            ValidationException exception = assertThrows(ValidationException.class, () ->
                    datasetService.uploadDataset(file, name, description));

            assertThat(exception.getMessage()).contains("Failed to store dataset file: Disk full");
            verify(datasetRepository).existsByName(name);
            verify(datasetRepository, never()).save(any(Dataset.class));
        }
    }

    @Test
    @DisplayName("Should retrieve dataset by ID successfully")
    void getDatasetById_success() {
        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));

        DatasetDto result = datasetService.getDatasetById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo(datasetDto1.getName());
        verify(datasetRepository).findById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException if dataset not found by ID")
    void getDatasetById_notFound_throwsException() {
        when(datasetRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () ->
                datasetService.getDatasetById(99L));

        assertThat(exception.getMessage()).isEqualTo("Dataset not found with ID: 99");
        verify(datasetRepository).findById(99L);
    }

    @Test
    @DisplayName("Should retrieve all datasets with pagination successfully")
    void getAllDatasets_success() {
        Pageable pageable = PageRequest.of(0, 10);
        List<Dataset> datasets = Arrays.asList(dataset1, dataset2);
        Page<Dataset> datasetPage = new PageImpl<>(datasets, pageable, datasets.size());

        when(datasetRepository.findAll(pageable)).thenReturn(datasetPage);

        Page<DatasetDto> resultPage = datasetService.getAllDatasets(pageable);

        assertThat(resultPage).isNotNull();
        assertThat(resultPage.getTotalElements()).isEqualTo(2);
        assertThat(resultPage.getContent()).hasSize(2);
        assertThat(resultPage.getContent().get(0).getName()).isEqualTo(datasetDto1.getName());
        verify(datasetRepository).findAll(pageable);
    }

    @Test
    @DisplayName("Should update dataset successfully")
    void updateDataset_success() {
        DatasetDto updateDto = new DatasetDto();
        updateDto.setName("Updated Iris Dataset");
        updateDto.setDescription("Updated description for Iris");
        updateDto.setSizeBytes(150L); // This field is excluded from direct copy

        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));
        when(datasetRepository.existsByName("Updated Iris Dataset")).thenReturn(false); // No name conflict
        when(datasetRepository.save(any(Dataset.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DatasetDto result = datasetService.updateDataset(1L, updateDto);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Updated Iris Dataset");
        assertThat(result.getDescription()).isEqualTo("Updated description for Iris");
        assertThat(result.getSizeBytes()).isEqualTo(dataset1.getSizeBytes()); // SizeBytes not updated via DTO
        verify(datasetRepository).findById(1L);
        verify(datasetRepository).existsByName("Updated Iris Dataset");
        verify(datasetRepository).save(any(Dataset.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException if dataset not found for update")
    void updateDataset_notFound_throwsException() {
        DatasetDto updateDto = new DatasetDto();
        updateDto.setName("Non Existent");

        when(datasetRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () ->
                datasetService.updateDataset(99L, updateDto));

        assertThat(exception.getMessage()).isEqualTo("Dataset not found with ID: 99");
        verify(datasetRepository).findById(99L);
        verify(datasetRepository, never()).save(any(Dataset.class));
    }

    @Test
    @DisplayName("Should throw ValidationException if updated name conflicts with existing dataset")
    void updateDataset_nameConflict_throwsException() {
        DatasetDto updateDto = new DatasetDto();
        updateDto.setName("Churn Data"); // Name of dataset2
        updateDto.setDescription("Description");

        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));
        when(datasetRepository.existsByName("Churn Data")).thenReturn(true);

        ValidationException exception = assertThrows(ValidationException.class, () ->
                datasetService.updateDataset(1L, updateDto));

        assertThat(exception.getMessage()).isEqualTo("Dataset with name 'Churn Data' already exists.");
        verify(datasetRepository).findById(1L);
        verify(datasetRepository).existsByName("Churn Data");
        verify(datasetRepository, never()).save(any(Dataset.class));
    }

    @Test
    @DisplayName("Should delete dataset and its file successfully")
    void deleteDataset_success() throws IOException {
        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));
        doNothing().when(datasetRepository).delete(dataset1);

        try (MockedStatic<Files> mockedFiles = mockStatic(Files.class);
             MockedStatic<Paths> mockedPaths = mockStatic(Paths.class)) {

            Path mockFilePath = mock(Path.class);
            when(mockPaths.get(dataset1.getStoragePath())).thenReturn(mockFilePath);
            when(mockedFiles.exists(mockFilePath)).thenReturn(true);
            doNothing().when(mockedFiles).delete(mockFilePath);

            datasetService.deleteDataset(1L);

            verify(datasetRepository).findById(1L);
            verify(datasetRepository).delete(dataset1);
            verify(mockedFiles).delete(mockFilePath);
        }
    }

    @Test
    @DisplayName("Should delete dataset even if file does not exist")
    void deleteDataset_fileNotFound_success() throws IOException {
        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));
        doNothing().when(datasetRepository).delete(dataset1);

        try (MockedStatic<Files> mockedFiles = mockStatic(Files.class);
             MockedStatic<Paths> mockedPaths = mockStatic(Paths.class)) {

            Path mockFilePath = mock(Path.class);
            when(mockPaths.get(dataset1.getStoragePath())).thenReturn(mockFilePath);
            when(mockedFiles.exists(mockFilePath)).thenReturn(false); // File does not exist

            datasetService.deleteDataset(1L);

            verify(datasetRepository).findById(1L);
            verify(datasetRepository).delete(dataset1);
            verify(mockedFiles, never()).delete(mockFilePath); // File deletion skipped
        }
    }

    @Test
    @DisplayName("Should delete dataset even if file deletion fails")
    void deleteDataset_fileDeletionFails_success() throws IOException {
        when(datasetRepository.findById(1L)).thenReturn(Optional.of(dataset1));
        doNothing().when(datasetRepository).delete(dataset1);

        try (MockedStatic<Files> mockedFiles = mockStatic(Files.class);
             MockedStatic<Paths> mockedPaths = mockStatic(Paths.class)) {

            Path mockFilePath = mock(Path.class);
            when(mockPaths.get(dataset1.getStoragePath())).thenReturn(mockFilePath);
            when(mockedFiles.exists(mockFilePath)).thenReturn(true);
            doThrow(new IOException("Permission denied")).when(mockedFiles).delete(mockFilePath); // Simulate IOException

            datasetService.deleteDataset(1L);

            verify(datasetRepository).findById(1L);
            verify(datasetRepository).delete(dataset1); // Still deletes from DB
            verify(mockedFiles).delete(mockFilePath); // Attempted deletion
        }
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException if dataset not found for deletion")
    void deleteDataset_notFound_throwsException() {
        when(datasetRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () ->
                datasetService.deleteDataset(99L));

        assertThat(exception.getMessage()).isEqualTo("Dataset not found with ID: 99");
        verify(datasetRepository).findById(99L);
        verify(datasetRepository, never()).delete(any(Dataset.class));
    }
}
```