```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.ModelDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.model.*;
import com.ml.utilities.system.repository.*;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModelServiceTest {

    @Mock
    private ModelRepository modelRepository;
    @Mock
    private ExperimentRepository experimentRepository;
    @Mock
    private DatasetRepository datasetRepository;
    @Mock
    private FeatureSetRepository featureSetRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SecurityContext securityContext;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private ModelService modelService;

    private Model model;
    private ModelDTO modelDTO;
    private User testUser;
    private Experiment experiment;
    private Dataset dataset;
    private FeatureSet featureSet;

    @BeforeEach
    void setUp() {
        testUser = new User(100L, "testuser", "test@example.com", "password", LocalDateTime.now(), LocalDateTime.now(), Set.of(new Role("USER")));
        experiment = new Experiment(1L, "Exp1", "Desc", null, null, "RUNNING", "Obj", null, null, testUser);
        dataset = new Dataset(2L, "DS1", "1.0", "s3://ds1", "Desc", 100L, 1000L, "CSV", null, null, testUser);
        featureSet = new FeatureSet(3L, "FS1", "1.0", "Desc", dataset, "git://code", null, null, testUser);

        model = new Model(1L, "Test Model", "1.0", experiment, dataset, featureSet,
                "s3://model_uri", "Scikit-learn", BigDecimal.valueOf(0.9),
                BigDecimal.valueOf(0.85), BigDecimal.valueOf(0.88), BigDecimal.valueOf(0.82),
                LocalDateTime.now(), LocalDateTime.now(), testUser);

        modelDTO = new ModelDTO(null, "New Model", "1.1", 1L, 2L, 3L,
                "s3://new_model_uri", "TensorFlow", BigDecimal.valueOf(0.91),
                BigDecimal.valueOf(0.86), BigDecimal.valueOf(0.89), BigDecimal.valueOf(0.83),
                null, null, null);

        // Mock SecurityContextHolder for createdBy user
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
    }

    @Test
    void createModel_Success() {
        when(experimentRepository.findById(1L)).thenReturn(Optional.of(experiment));
        when(datasetRepository.findById(2L)).thenReturn(Optional.of(dataset));
        when(featureSetRepository.findById(3L)).thenReturn(Optional.of(featureSet));
        when(modelRepository.save(any(Model.class))).thenReturn(model);

        ModelDTO result = modelService.createModel(modelDTO);

        assertNotNull(result);
        assertEquals(model.getName(), result.getName());
        assertEquals(model.getVersion(), result.getVersion());
        assertEquals(experiment.getId(), result.getExperimentId());
        verify(modelRepository, times(1)).save(any(Model.class));
    }

    @Test
    void createModel_ExperimentNotFound() {
        when(experimentRepository.findById(1L)).thenReturn(Optional.empty());

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> modelService.createModel(modelDTO));

        assertEquals("Experiment not found with id: 1", thrown.getMessage());
        verify(modelRepository, never()).save(any(Model.class));
    }

    @Test
    void getModelById_Success() {
        when(modelRepository.findById(1L)).thenReturn(Optional.of(model));

        Optional<ModelDTO> result = modelService.getModelById(1L);

        assertTrue(result.isPresent());
        assertEquals(model.getName(), result.get().getName());
        verify(modelRepository, times(1)).findById(1L);
    }

    @Test
    void getModelById_NotFound() {
        when(modelRepository.findById(1L)).thenReturn(Optional.empty());

        Optional<ModelDTO> result = modelService.getModelById(1L);

        assertFalse(result.isPresent());
        verify(modelRepository, times(1)).findById(1L);
    }

    @Test
    void getAllModels_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        List<Model> modelList = Collections.singletonList(model);
        Page<Model> modelPage = new PageImpl<>(modelList, pageable, modelList.size());

        when(modelRepository.findAll(pageable)).thenReturn(modelPage);

        Page<ModelDTO> result = modelService.getAllModels(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(model.getName(), result.getContent().get(0).getName());
        verify(modelRepository, times(1)).findAll(pageable);
    }

    @Test
    void updateModel_Success() {
        ModelDTO updatedDTO = new ModelDTO(1L, "Updated Name", "1.2", 1L, 2L, 3L,
                "s3://updated_model_uri", "PyTorch", BigDecimal.valueOf(0.92),
                BigDecimal.valueOf(0.87), BigDecimal.valueOf(0.90), BigDecimal.valueOf(0.84),
                null, null, null);

        when(modelRepository.findById(1L)).thenReturn(Optional.of(model));
        when(experimentRepository.findById(1L)).thenReturn(Optional.of(experiment));
        when(datasetRepository.findById(2L)).thenReturn(Optional.of(dataset));
        when(featureSetRepository.findById(3L)).thenReturn(Optional.of(featureSet));
        when(modelRepository.save(any(Model.class))).thenReturn(model);

        ModelDTO result = modelService.updateModel(1L, updatedDTO);

        assertNotNull(result);
        assertEquals("Updated Name", result.getName());
        assertEquals("1.2", result.getVersion());
        assertEquals("PyTorch", result.getFramework());
        verify(modelRepository, times(1)).findById(1L);
        verify(modelRepository, times(1)).save(any(Model.class));
    }

    @Test
    void updateModel_NotFound() {
        ModelDTO updatedDTO = new ModelDTO(1L, "Updated Name", "1.2", 1L, 2L, 3L,
                "s3://updated_model_uri", "PyTorch", BigDecimal.valueOf(0.92),
                BigDecimal.valueOf(0.87), BigDecimal.valueOf(0.90), BigDecimal.valueOf(0.84),
                null, null, null);
        when(modelRepository.findById(1L)).thenReturn(Optional.empty());

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> modelService.updateModel(1L, updatedDTO));

        assertEquals("Model not found with id: 1", thrown.getMessage());
        verify(modelRepository, times(1)).findById(1L);
        verify(modelRepository, never()).save(any(Model.class));
    }

    @Test
    void deleteModel_Success() {
        when(modelRepository.existsById(1L)).thenReturn(true);
        doNothing().when(modelRepository).deleteById(1L);

        assertDoesNotThrow(() -> modelService.deleteModel(1L));

        verify(modelRepository, times(1)).existsById(1L);
        verify(modelRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteModel_NotFound() {
        when(modelRepository.existsById(1L)).thenReturn(false);

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> modelService.deleteModel(1L));

        assertEquals("Model not found with id: 1", thrown.getMessage());
        verify(modelRepository, times(1)).existsById(1L);
        verify(modelRepository, never()).deleteById(anyLong());
    }
}
```