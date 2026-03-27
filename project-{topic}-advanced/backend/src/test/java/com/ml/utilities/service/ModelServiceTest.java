```java
package com.ml.utilities.service;

import com.ml.utilities.dto.ModelDTO;
import com.ml.utilities.dto.ModelVersionDTO;
import com.ml.utilities.entity.Model;
import com.ml.utilities.entity.ModelType;
import com.ml.utilities.entity.ModelVersion;
import com.ml.utilities.exception.ResourceNotFoundException;
import com.ml.utilities.repository.ModelRepository;
import com.ml.utilities.repository.ModelVersionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModelServiceTest {

    @Mock
    private ModelRepository modelRepository;

    @Mock
    private ModelVersionRepository modelVersionRepository;

    @InjectMocks
    private ModelService modelService;

    private Model testModel;
    private ModelVersion testModelVersion1;
    private ModelVersion testModelVersion2;

    @BeforeEach
    void setUp() {
        testModel = Model.builder()
                .id(1L)
                .name("TestModel")
                .description("A test model")
                .type(ModelType.CLASSIFICATION)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        testModelVersion1 = ModelVersion.builder()
                .id(101L)
                .model(testModel)
                .versionNumber("1.0.0")
                .modelPath("/path/to/v1")
                .isDefault(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        testModelVersion2 = ModelVersion.builder()
                .id(102L)
                .model(testModel)
                .versionNumber("1.0.1")
                .modelPath("/path/to/v2")
                .isDefault(false)
                .createdAt(LocalDateTime.now().plusHours(1))
                .updatedAt(LocalDateTime.now().plusHours(1))
                .build();

        testModel.setVersions(Arrays.asList(testModelVersion1, testModelVersion2));
    }

    // --- Model CRUD Tests ---
    @Test
    void getAllModels_shouldReturnListOfModels() {
        when(modelRepository.findAll()).thenReturn(List.of(testModel));

        List<ModelDTO> result = modelService.getAllModels();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("TestModel", result.get(0).getName());
        verify(modelRepository, times(1)).findAll();
    }

    @Test
    void getModelById_shouldReturnModelDTO() {
        when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));

        ModelDTO result = modelService.getModelById(1L);

        assertNotNull(result);
        assertEquals("TestModel", result.getName());
        verify(modelRepository, times(1)).findById(1L);
    }

    @Test
    void getModelById_shouldThrowResourceNotFoundException() {
        when(modelRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> modelService.getModelById(99L));
        verify(modelRepository, times(1)).findById(99L);
    }

    @Test
    void createModel_shouldReturnCreatedModelDTO() {
        ModelDTO newModelDTO = ModelDTO.builder()
                .name("NewModel")
                .description("New description")
                .type(ModelType.REGRESSION)
                .build();
        Model newModel = Model.builder()
                .name("NewModel")
                .description("New description")
                .type(ModelType.REGRESSION)
                .build();

        when(modelRepository.findByName(newModelDTO.getName())).thenReturn(Optional.empty());
        when(modelRepository.save(any(Model.class))).thenReturn(newModel);

        ModelDTO result = modelService.createModel(newModelDTO);

        assertNotNull(result);
        assertEquals("NewModel", result.getName());
        verify(modelRepository, times(1)).findByName("NewModel");
        verify(modelRepository, times(1)).save(any(Model.class));
    }

    @Test
    void createModel_shouldThrowIllegalArgumentExceptionIfNameExists() {
        ModelDTO newModelDTO = ModelDTO.builder().name("TestModel").build();
        when(modelRepository.findByName(newModelDTO.getName())).thenReturn(Optional.of(testModel));

        assertThrows(IllegalArgumentException.class, () -> modelService.createModel(newModelDTO));
        verify(modelRepository, never()).save(any(Model.class));
    }

    @Test
    void updateModel_shouldReturnUpdatedModelDTO() {
        ModelDTO updateDTO = ModelDTO.builder()
                .name("UpdatedModel")
                .description("Updated description")
                .type(ModelType.REGRESSION)
                .build();
        Model updatedModel = Model.builder()
                .id(1L)
                .name("UpdatedModel")
                .description("Updated description")
                .type(ModelType.REGRESSION)
                .build();

        when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
        when(modelRepository.findByName("UpdatedModel")).thenReturn(Optional.empty()); // New name is unique
        when(modelRepository.save(any(Model.class))).thenReturn(updatedModel);

        ModelDTO result = modelService.updateModel(1L, updateDTO);

        assertNotNull(result);
        assertEquals("UpdatedModel", result.getName());
        verify(modelRepository, times(1)).findById(1L);
        verify(modelRepository, times(1)).save(any(Model.class));
    }

    @Test
    void updateModel_shouldThrowIllegalArgumentExceptionIfNewNameExists() {
        ModelDTO updateDTO = ModelDTO.builder().name("AnotherModel").build();
        Model anotherModel = Model.builder().id(2L).name("AnotherModel").build();

        when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
        when(modelRepository.findByName("AnotherModel")).thenReturn(Optional.of(anotherModel));

        assertThrows(IllegalArgumentException.class, () -> modelService.updateModel(1L, updateDTO));
        verify(modelRepository, never()).save(any(Model.class));
    }

    @Test
    void deleteModel_shouldDeleteModel() {
        when(modelRepository.existsById(1L)).thenReturn(true);
        doNothing().when(modelRepository).deleteById(1L);

        modelService.deleteModel(1L);

        verify(modelRepository, times(1)).existsById(1L);
        verify(modelRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteModel_shouldThrowResourceNotFoundException() {
        when(modelRepository.existsById(anyLong())).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> modelService.deleteModel(99L));
        verify(modelRepository, never()).deleteById(anyLong());
    }

    // --- Model Version CRUD Tests ---
    @Test
    void getModelVersions_shouldReturnListOfModelVersionDTOs() {
        when(modelRepository.existsById(1L)).thenReturn(true);
        when(modelVersionRepository.findByModelId(1L)).thenReturn(Arrays.asList(testModelVersion1, testModelVersion2));

        List<ModelVersionDTO> result = modelService.getModelVersions(1L);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("1.0.0", result.get(0).getVersionNumber());
        verify(modelVersionRepository, times(1)).findByModelId(1L);
    }

    @Test
    void getModelVersions_shouldThrowResourceNotFoundExceptionForInvalidModel() {
        when(modelRepository.existsById(anyLong())).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> modelService.getModelVersions(99L));
    }

    @Test
    void getModelVersionById_shouldReturnModelVersionDTO() {
        when(modelVersionRepository.findById(101L)).thenReturn(Optional.of(testModelVersion1));

        ModelVersionDTO result = modelService.getModelVersionById(1L, 101L);

        assertNotNull(result);
        assertEquals("1.0.0", result.getVersionNumber());
        verify(modelVersionRepository, times(1)).findById(101L);
    }

    @Test
    void getModelVersionById_shouldThrowResourceNotFoundExceptionForInvalidVersion() {
        when(modelVersionRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> modelService.getModelVersionById(1L, 999L));
    }

    @Test
    void getModelVersionById_shouldThrowIllegalArgumentExceptionIfModelMismatch() {
        ModelVersion wrongModelVersion = ModelVersion.builder().id(103L).model(Model.builder().id(2L).build()).build();
        when(modelVersionRepository.findById(103L)).thenReturn(Optional.of(wrongModelVersion));
        assertThrows(IllegalArgumentException.class, () -> modelService.getModelVersionById(1L, 103L));
    }


    @Test
    void addModelVersion_shouldAddAndSetDefaultCorrectly() {
        ModelVersionDTO newVersionDTO = ModelVersionDTO.builder()
                .versionNumber("1.1.0")
                .modelPath("/path/to/v1.1")
                .isDefault(true)
                .build();
        ModelVersion newVersion = ModelVersion.builder()
                .id(103L)
                .model(testModel)
                .versionNumber("1.1.0")
                .modelPath("/path/to/v1.1")
                .isDefault(true)
                .build();

        when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
        when(modelVersionRepository.findByModelIdAndVersionNumber(1L, "1.1.0")).thenReturn(Optional.empty());
        when(modelVersionRepository.findByModelId(1L)).thenReturn(Arrays.asList(testModelVersion1, testModelVersion2)); // Existing versions
        when(modelVersionRepository.save(any(ModelVersion.class))).thenReturn(newVersion);

        ModelVersionDTO result = modelService.addModelVersion(1L, newVersionDTO);

        assertNotNull(result);
        assertEquals("1.1.0", result.getVersionNumber());
        assertTrue(result.isDefault());
        verify(modelVersionRepository, times(1)).save(argThat(v -> v.isDefault() && v.getVersionNumber().equals("1.1.0"))); // New version is default
        verify(modelVersionRepository, times(1)).save(argThat(v -> !v.isDefault() && v.getVersionNumber().equals("1.0.0"))); // Old default unset
    }

    @Test
    void addModelVersion_shouldSetAsDefaultIfFirstVersion() {
        ModelVersionDTO newVersionDTO = ModelVersionDTO.builder()
                .versionNumber("1.0.0")
                .modelPath("/path/to/v1")
                .isDefault(false) // Explicitly not default, but should become default as first
                .build();
        ModelVersion newVersion = ModelVersion.builder()
                .id(101L)
                .model(testModel)
                .versionNumber("1.0.0")
                .modelPath("/path/to/v1")
                .isDefault(true) // Should be set to true by service
                .build();

        // Clear existing versions for the test model
        testModel.setVersions(List.of());

        when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
        when(modelVersionRepository.findByModelIdAndVersionNumber(1L, "1.0.0")).thenReturn(Optional.empty());
        when(modelVersionRepository.findByModelId(1L)).thenReturn(List.of()); // No existing versions
        when(modelVersionRepository.findByModelIdAndIsDefaultTrue(1L)).thenReturn(Optional.empty()); // No default exists
        when(modelVersionRepository.save(any(ModelVersion.class))).thenReturn(newVersion);

        ModelVersionDTO result = modelService.addModelVersion(1L, newVersionDTO);

        assertNotNull(result);
        assertEquals("1.0.0", result.getVersionNumber());
        assertTrue(result.isDefault()); // Assert it became default
        verify(modelVersionRepository, times(1)).save(argThat(v -> v.isDefault() && v.getVersionNumber().equals("1.0.0")));
    }


    @Test
    void addModelVersion_shouldThrowIllegalArgumentExceptionIfVersionExists() {
        ModelVersionDTO newVersionDTO = ModelVersionDTO.builder().versionNumber("1.0.0").build();
        when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
        when(modelVersionRepository.findByModelIdAndVersionNumber(1L, "1.0.0")).thenReturn(Optional.of(testModelVersion1));

        assertThrows(IllegalArgumentException.class, () -> modelService.addModelVersion(1L, newVersionDTO));
        verify(modelVersionRepository, never()).save(any(ModelVersion.class));
    }

    @Test
    void updateModelVersion_shouldUpdateAndManageDefault() {
        ModelVersionDTO updateDTO = ModelVersionDTO.builder()
                .versionNumber("1.0.0-updated")
                .modelPath("/path/to/v1-updated")
                .isDefault(true) // Make this the new default
                .build();

        when(modelVersionRepository.findById(101L)).thenReturn(Optional.of(testModelVersion1));
        when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel)); // Needed for stream
        when(modelVersionRepository.findByModelIdAndVersionNumber(1L, "1.0.0-updated")).thenReturn(Optional.empty());
        when(modelVersionRepository.findByModelId(1L)).thenReturn(Arrays.asList(testModelVersion1, testModelVersion2));
        when(modelVersionRepository.save(any(ModelVersion.class))).thenAnswer(invocation -> {
            ModelVersion saved = invocation.getArgument(0);
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        ModelVersionDTO result = modelService.updateModelVersion(1L, 101L, updateDTO);

        assertNotNull(result);
        assertEquals("1.0.0-updated", result.getVersionNumber());
        assertTrue(result.isDefault()); // This version is now default
        verify(modelVersionRepository, times(2)).save(any(ModelVersion.class)); // One for updating 101, one for unsetting 102 (if it was default)
        verify(modelVersionRepository, times(1)).findByModelId(1L); // To unset other defaults
    }

    @Test
    void updateModelVersion_shouldUnsetDefaultAndSetNewDefaultIfRequired() {
        // Initial setup: V1 is default, V2 is not. Change V1 to not default, and ensure V2 becomes default.
        testModelVersion1.setDefault(true);
        testModelVersion2.setDefault(false);
        testModel.setVersions(Arrays.asList(testModelVersion1, testModelVersion2));

        ModelVersionDTO updateDTO = ModelVersionDTO.builder()
                .versionNumber("1.0.0") // Keep same version number for V1
                .modelPath("/path/to/v1-updated")
                .isDefault(false) // Unset default for V1
                .build();

        when(modelVersionRepository.findById(testModelVersion1.getId())).thenReturn(Optional.of(testModelVersion1));
        when(modelVersionRepository.findByModelId(testModel.getId())).thenReturn(Arrays.asList(testModelVersion1, testModelVersion2));
        when(modelVersionRepository.save(any(ModelVersion.class))).thenAnswer(invocation -> invocation.getArgument(0)); // Return the argument

        ModelVersionDTO result = modelService.updateModelVersion(testModel.getId(), testModelVersion1.getId(), updateDTO);

        assertNotNull(result);
        assertFalse(result.isDefault()); // V1 should no longer be default
        verify(modelVersionRepository, times(2)).save(any(ModelVersion.class)); // One for V1, one for V2 (to make it default)
        // Verify V2 became default
        assertTrue(testModelVersion2.isDefault()); // Direct check on the mocked object after interaction
    }

    @Test
    void deleteModelVersion_shouldDeleteVersionAndReassignDefault() {
        when(modelVersionRepository.findById(101L)).thenReturn(Optional.of(testModelVersion1));
        when(modelVersionRepository.findByModelId(1L)).thenReturn(Arrays.asList(testModelVersion1, testModelVersion2));
        doNothing().when(modelVersionRepository).delete(testModelVersion1);
        when(modelVersionRepository.save(any(ModelVersion.class))).thenReturn(testModelVersion2); // Simulate saving the new default

        modelService.deleteModelVersion(1L, 101L);

        verify(modelVersionRepository, times(1)).delete(testModelVersion1);
        verify(modelVersionRepository, times(1)).save(argThat(v -> v.isDefault() && v.getId().equals(testModelVersion2.getId())));
    }

    @Test
    void deleteModelVersion_shouldThrowResourceNotFoundExceptionForInvalidVersion() {
        when(modelVersionRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> modelService.deleteModelVersion(1L, 999L));
        verify(modelVersionRepository, never()).delete(any(ModelVersion.class));
    }
}
```