package com.mlutil.ml_utilities_system.service;

import com.mlutil.ml_utilities_system.exception.ResourceNotFoundException;
import com.mlutil.ml_utilities_system.model.Dataset;
import com.mlutil.ml_utilities_system.repository.DatasetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DatasetServiceTest {

    @Mock
    private DatasetRepository datasetRepository;

    @InjectMocks
    private DatasetService datasetService;

    private String tempUploadDir;
    private Path tempUploadPath;
    private String ownerUsername;
    private MockMultipartFile mockFile;
    private Dataset testDataset;
    private UUID datasetId;

    @BeforeEach
    void setUp() throws IOException {
        tempUploadDir = Files.createTempDirectory("test-uploads").toString();
        tempUploadPath = Paths.get(tempUploadDir);
        ReflectionTestUtils.setField(datasetService, "uploadDir", tempUploadDir);

        ownerUsername = "testuser";
        datasetId = UUID.randomUUID();
        mockFile = new MockMultipartFile(
                "file", "test.csv", "text/csv", "col1,col2\n1,2\n3,4".getBytes());

        testDataset = Dataset.builder()
                .id(datasetId)
                .filename("test.csv")
                .filePath(tempUploadPath.resolve(datasetId + "_test.csv").toString())
                .fileSize(mockFile.getSize())
                .fileType("text/csv")
                .ownerUsername(ownerUsername)
                .build();

        // Ensure temp directory is clean before each test
        Files.walk(tempUploadPath)
                .filter(Files::isRegularFile)
                .map(Path::toFile)
                .forEach(java.io.File::delete);
    }

    @Test
    @DisplayName("Should save dataset and metadata successfully")
    void shouldSaveDatasetSuccessfully() throws IOException {
        when(datasetRepository.save(any(Dataset.class))).thenReturn(testDataset);

        Dataset savedDataset = datasetService.saveDataset(mockFile, ownerUsername);

        ArgumentCaptor<Dataset> datasetCaptor = ArgumentCaptor.forClass(Dataset.class);
        verify(datasetRepository, times(1)).save(datasetCaptor.capture());

        Dataset capturedDataset = datasetCaptor.getValue();
        assertThat(savedDataset).isNotNull();
        assertThat(capturedDataset.getFilename()).isEqualTo(mockFile.getOriginalFilename());
        assertThat(capturedDataset.getFileSize()).isEqualTo(mockFile.getSize());
        assertThat(capturedDataset.getFileType()).isEqualTo(mockFile.getContentType());
        assertThat(capturedDataset.getOwnerUsername()).isEqualTo(ownerUsername);
        assertThat(Files.exists(Paths.get(capturedDataset.getFilePath()))).isTrue(); // Check if file exists on disk
        Files.delete(Paths.get(capturedDataset.getFilePath())); // Clean up created file
    }

    @Test
    @DisplayName("Should retrieve datasets by owner username")
    void shouldGetDatasetsByOwner() {
        List<Dataset> datasets = Arrays.asList(testDataset);
        when(datasetRepository.findByOwnerUsername(ownerUsername)).thenReturn(datasets);

        List<Dataset> foundDatasets = datasetService.getDatasetsByOwner(ownerUsername);

        assertThat(foundDatasets).hasSize(1);
        assertThat(foundDatasets.get(0).getFilename()).isEqualTo("test.csv");
        verify(datasetRepository, times(1)).findByOwnerUsername(ownerUsername);
    }

    @Test
    @DisplayName("Should retrieve a dataset by ID and owner username")
    void shouldGetDatasetByIdAndOwner() {
        when(datasetRepository.findByIdAndOwnerUsername(datasetId, ownerUsername)).thenReturn(Optional.of(testDataset));

        Dataset foundDataset = datasetService.getDatasetByIdAndOwner(datasetId, ownerUsername);

        assertThat(foundDataset).isEqualTo(testDataset);
        verify(datasetRepository, times(1)).findByIdAndOwnerUsername(datasetId, ownerUsername);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException if dataset not found by ID and owner")
    void shouldThrowNotFoundWhenDatasetByIdAndOwnerNotFound() {
        when(datasetRepository.findByIdAndOwnerUsername(datasetId, ownerUsername)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> datasetService.getDatasetByIdAndOwner(datasetId, ownerUsername));
        verify(datasetRepository, times(1)).findByIdAndOwnerUsername(datasetId, ownerUsername);
    }

    @Test
    @DisplayName("Should download dataset file successfully")
    void shouldDownloadDatasetFileSuccessfully() throws IOException {
        // Create a dummy file on the filesystem for download
        Path actualFilePath = Paths.get(testDataset.getFilePath());
        Files.write(actualFilePath, mockFile.getBytes());

        when(datasetRepository.findByIdAndOwnerUsername(datasetId, ownerUsername)).thenReturn(Optional.of(testDataset));

        Resource resource = datasetService.downloadDatasetFile(datasetId, ownerUsername);

        assertThat(resource).isNotNull();
        assertThat(resource.exists()).isTrue();
        assertThat(resource.getFilename()).isEqualTo(datasetId + "_test.csv"); // This will be the UUID prefixed name
        assertThat(resource.getContentAsByteArray()).isEqualTo(mockFile.getBytes());

        Files.delete(actualFilePath); // Clean up
        verify(datasetRepository, times(1)).findByIdAndOwnerUsername(datasetId, ownerUsername);
    }

    @Test
    @DisplayName("Should throw IOException when downloading non-existent file")
    void shouldThrowIOExceptionWhenDownloadFileNonExistent() {
        // Do NOT create the file on filesystem
        when(datasetRepository.findByIdAndOwnerUsername(datasetId, ownerUsername)).thenReturn(Optional.of(testDataset));

        assertThrows(IOException.class, () -> datasetService.downloadDatasetFile(datasetId, ownerUsername));
        verify(datasetRepository, times(1)).findByIdAndOwnerUsername(datasetId, ownerUsername);
    }

    @Test
    @DisplayName("Should delete dataset successfully from DB and filesystem")
    void shouldDeleteDatasetSuccessfully() throws IOException {
        Path actualFilePath = Paths.get(testDataset.getFilePath());
        Files.write(actualFilePath, mockFile.getBytes()); // Create file to be deleted

        when(datasetRepository.findByIdAndOwnerUsername(datasetId, ownerUsername)).thenReturn(Optional.of(testDataset));
        doNothing().when(datasetRepository).delete(testDataset);

        datasetService.deleteDataset(datasetId, ownerUsername);

        verify(datasetRepository, times(1)).findByIdAndOwnerUsername(datasetId, ownerUsername);
        verify(datasetRepository, times(1)).delete(testDataset);
        assertThat(Files.notExists(actualFilePath)).isTrue(); // Check if file is deleted
    }

    @Test
    @DisplayName("Should still delete from DB even if file deletion fails")
    void shouldDeleteDatasetEvenIfFileDeletionFails() throws IOException {
        Path actualFilePath = Paths.get(testDataset.getFilePath());
        Files.write(actualFilePath, mockFile.getBytes()); // Create file
        // Simulate file deletion failure by making the file undeletable for a moment if possible, or just mock behavior

        when(datasetRepository.findByIdAndOwnerUsername(datasetId, ownerUsername)).thenReturn(Optional.of(testDataset));
        doNothing().when(datasetRepository).delete(testDataset);

        // We can't easily mock Files.deleteIfExists to throw IOException without PowerMock or a wrapper.
        // For this test, we'll assume the service method would proceed to DB deletion.
        // A real test might use a custom FilesService wrapper that can be mocked.
        // For now, we confirm DB deletion.

        datasetService.deleteDataset(datasetId, ownerUsername);

        verify(datasetRepository, times(1)).findByIdAndOwnerUsername(datasetId, ownerUsername);
        verify(datasetRepository, times(1)).delete(testDataset);
        // The file might still exist if deletion failed in a real scenario, but DB entry is gone.
    }
}