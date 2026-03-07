```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.FeatureSetDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.FeatureSet;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.DatasetRepository;
import com.ml.utilities.system.repository.FeatureSetRepository;
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
class FeatureSetServiceTest {

    @Mock
    private FeatureSetRepository featureSetRepository;
    @Mock
    private DatasetRepository datasetRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SecurityContext securityContext;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private FeatureSetService featureSetService;

    private FeatureSet featureSet;
    private FeatureSetDTO featureSetDTO;
    private User testUser;
    private Dataset sourceDataset;

    @BeforeEach
    void setUp() {
        testUser = new User(100L, "testuser", "test@example.com", "password", LocalDateTime.now(), LocalDateTime.now(), Set.of(new Role("USER")));
        sourceDataset = new Dataset(2L, "Raw Data", "1.0", "s3://raw-data", "Raw", 100L, 1000L, "CSV", null, null, testUser);

        featureSet = new FeatureSet(1L, "Test FeatureSet", "1.0", "Description",
                sourceDataset, "git://code", LocalDateTime.now(), LocalDateTime.now(), testUser);

        featureSetDTO = new FeatureSetDTO(null, "New FeatureSet", "1.1", "New Description",
                2L, "git://new-code", null, null, null);

        // Mock SecurityContextHolder for createdBy user
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
    }

    @Test
    void createFeatureSet_Success() {
        when(datasetRepository.findById(2L)).thenReturn(Optional.of(sourceDataset));
        when(featureSetRepository.save(any(FeatureSet.class))).thenReturn(featureSet);

        FeatureSetDTO result = featureSetService.createFeatureSet(featureSetDTO);

        assertNotNull(result);
        assertEquals(featureSet.getName(), result.getName());
        assertEquals(featureSet.getVersion(), result.getVersion());
        assertEquals(sourceDataset.getId(), result.getSourceDatasetId());
        assertNotNull(result.getCreatedByUserId());
        verify(featureSetRepository, times(1)).save(any(FeatureSet.class));
    }

    @Test
    void createFeatureSet_SourceDatasetNotFound() {
        when(datasetRepository.findById(2L)).thenReturn(Optional.empty());

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> featureSetService.createFeatureSet(featureSetDTO));

        assertEquals("Source Dataset not found with id: 2", thrown.getMessage());
        verify(featureSetRepository, never()).save(any(FeatureSet.class));
    }

    @Test
    void getFeatureSetById_Success() {
        when(featureSetRepository.findById(1L)).thenReturn(Optional.of(featureSet));

        Optional<FeatureSetDTO> result = featureSetService.getFeatureSetById(1L);

        assertTrue(result.isPresent());
        assertEquals(featureSet.getName(), result.get().getName());
        verify(featureSetRepository, times(1)).findById(1L);
    }

    @Test
    void getFeatureSetById_NotFound() {
        when(featureSetRepository.findById(1L)).thenReturn(Optional.empty());

        Optional<FeatureSetDTO> result = featureSetService.getFeatureSetById(1L);

        assertFalse(result.isPresent());
        verify(featureSetRepository, times(1)).findById(1L);
    }

    @Test
    void getAllFeatureSets_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        List<FeatureSet> featureSetList = Collections.singletonList(featureSet);
        Page<FeatureSet> featureSetPage = new PageImpl<>(featureSetList, pageable, featureSetList.size());

        when(featureSetRepository.findAll(pageable)).thenReturn(featureSetPage);

        Page<FeatureSetDTO> result = featureSetService.getAllFeatureSets(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(featureSet.getName(), result.getContent().get(0).getName());
        verify(featureSetRepository, times(1)).findAll(pageable);
    }

    @Test
    void updateFeatureSet_Success() {
        FeatureSetDTO updatedDTO = new FeatureSetDTO(1L, "Updated FeatureSet", "1.2",
                "Updated Description", 2L, "git://updated-code", null, null, null);

        when(featureSetRepository.findById(1L)).thenReturn(Optional.of(featureSet));
        when(datasetRepository.findById(2L)).thenReturn(Optional.of(sourceDataset));
        when(featureSetRepository.save(any(FeatureSet.class))).thenReturn(featureSet);

        FeatureSetDTO result = featureSetService.updateFeatureSet(1L, updatedDTO);

        assertNotNull(result);
        assertEquals("Updated FeatureSet", result.getName());
        assertEquals("1.2", result.getVersion());
        assertEquals("git://updated-code", result.getTransformationCodeUri());
        verify(featureSetRepository, times(1)).findById(1L);
        verify(featureSetRepository, times(1)).save(any(FeatureSet.class));
    }

    @Test
    void updateFeatureSet_NotFound() {
        FeatureSetDTO updatedDTO = new FeatureSetDTO(1L, "Updated FeatureSet", "1.2",
                "Updated Description", 2L, "git://updated-code", null, null, null);
        when(featureSetRepository.findById(1L)).thenReturn(Optional.empty());

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> featureSetService.updateFeatureSet(1L, updatedDTO));

        assertEquals("Feature Set not found with id: 1", thrown.getMessage());
        verify(featureSetRepository, times(1)).findById(1L);
        verify(featureSetRepository, never()).save(any(FeatureSet.class));
    }

    @Test
    void deleteFeatureSet_Success() {
        when(featureSetRepository.existsById(1L)).thenReturn(true);
        doNothing().when(featureSetRepository).deleteById(1L);

        assertDoesNotThrow(() -> featureSetService.deleteFeatureSet(1L));

        verify(featureSetRepository, times(1)).existsById(1L);
        verify(featureSetRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteFeatureSet_NotFound() {
        when(featureSetRepository.existsById(1L)).thenReturn(false);

        ResourceNotFoundException thrown = assertThrows(ResourceNotFoundException.class,
                () -> featureSetService.deleteFeatureSet(1L));

        assertEquals("Feature Set not found with id: 1", thrown.getMessage());
        verify(featureSetRepository, times(1)).existsById(1L);
        verify(featureSetRepository, never()).deleteById(anyLong());
    }
}
```