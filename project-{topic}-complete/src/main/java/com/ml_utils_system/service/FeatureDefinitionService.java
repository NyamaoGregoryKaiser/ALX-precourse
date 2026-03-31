```java
package com.ml_utils_system.service;

import com.ml_utils_system.dto.FeatureDefinitionDto;
import com.ml_utils_system.exception.ResourceNotFoundException;
import com.ml_utils_system.exception.ValidationException;
import com.ml_utils_system.model.Dataset;
import com.ml_utils_system.model.FeatureDefinition;
import com.ml_utils_system.repository.DatasetRepository;
import com.ml_utils_system.repository.FeatureDefinitionRepository;
import com.ml_utils_system.util.CustomLogger;
import org.slf4j.Logger;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service class for managing feature definitions.
 * Handles business logic for creating, retrieving, updating, and deleting feature definitions.
 * Includes caching for performance optimization.
 */
@Service
public class FeatureDefinitionService {

    private static final Logger logger = CustomLogger.getLogger(FeatureDefinitionService.class);

    @Autowired
    private FeatureDefinitionRepository featureDefinitionRepository;

    @Autowired
    private DatasetRepository datasetRepository;

    /**
     * Creates a new feature definition.
     *
     * @param dto The DTO containing the feature definition details.
     * @return The created FeatureDefinitionDto.
     * @throws ValidationException If a feature with the same name and version already exists.
     * @throws ResourceNotFoundException If the source dataset ID is provided but not found.
     */
    @Transactional
    public FeatureDefinitionDto createFeatureDefinition(FeatureDefinitionDto dto) {
        logger.info("Attempting to create feature definition: {} (version {})", dto.getName(), dto.getVersion());

        if (featureDefinitionRepository.existsByNameAndVersion(dto.getName(), dto.getVersion())) {
            logger.warn("Feature definition creation failed: Feature with name '{}' and version '{}' already exists.", dto.getName(), dto.getVersion());
            throw new ValidationException("Feature definition with name '" + dto.getName() + "' and version '" + dto.getVersion() + "' already exists.");
        }

        FeatureDefinition featureDefinition = convertToEntity(dto);

        if (dto.getSourceDatasetId() != null) {
            Dataset dataset = datasetRepository.findById(dto.getSourceDatasetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Source Dataset not found with ID: " + dto.getSourceDatasetId()));
            featureDefinition.setSourceDataset(dataset);
        }

        FeatureDefinition savedFeature = featureDefinitionRepository.save(featureDefinition);
        logger.info("Feature definition '{}' (version {}) created successfully with ID: {}", savedFeature.getName(), savedFeature.getVersion(), savedFeature.getId());
        return convertToDto(savedFeature);
    }

    /**
     * Retrieves a feature definition by its ID. The result is cached.
     *
     * @param id The ID of the feature definition.
     * @return The FeatureDefinitionDto.
     * @throws ResourceNotFoundException If the feature definition is not found.
     */
    @Cacheable(value = "featureDefinitions", key = "#id")
    @Transactional(readOnly = true)
    public FeatureDefinitionDto getFeatureDefinitionById(Long id) {
        logger.debug("Fetching feature definition with ID: {}", id);
        FeatureDefinition featureDefinition = featureDefinitionRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Feature definition not found with ID: {}", id);
                    return new ResourceNotFoundException("Feature definition not found with ID: " + id);
                });
        logger.debug("Feature definition with ID {} retrieved successfully.", id);
        return convertToDto(featureDefinition);
    }

    /**
     * Retrieves all feature definitions, with pagination support. The results are cached.
     *
     * @param pageable Pagination information.
     * @return A Page of FeatureDefinitionDto.
     */
    @Cacheable(value = "featureDefinitions", key = "'allFeatures-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort")
    @Transactional(readOnly = true)
    public Page<FeatureDefinitionDto> getAllFeatureDefinitions(Pageable pageable) {
        logger.debug("Fetching all feature definitions for page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        Page<FeatureDefinition> featureDefinitions = featureDefinitionRepository.findAll(pageable);
        return featureDefinitions.map(this::convertToDto);
    }

    /**
     * Updates an existing feature definition. The cache for this feature is updated.
     *
     * @param id The ID of the feature definition to update.
     * @param dto The DTO containing updated feature definition information.
     * @return The updated FeatureDefinitionDto.
     * @throws ResourceNotFoundException If the feature definition or source dataset (if provided) is not found.
     * @throws ValidationException If the new name/version conflicts with an existing feature.
     */
    @CachePut(value = "featureDefinitions", key = "#id")
    @Transactional
    public FeatureDefinitionDto updateFeatureDefinition(Long id, FeatureDefinitionDto dto) {
        logger.info("Attempting to update feature definition with ID: {}", id);
        FeatureDefinition existingFeature = featureDefinitionRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Feature definition update failed: Feature not found with ID: {}", id);
                    return new ResourceNotFoundException("Feature definition not found with ID: " + id);
                });

        if (!existingFeature.getName().equals(dto.getName()) || !existingFeature.getVersion().equals(dto.getVersion())) {
            if (featureDefinitionRepository.existsByNameAndVersion(dto.getName(), dto.getVersion())) {
                logger.warn("Feature definition update failed: Feature with name '{}' and version '{}' already exists.", dto.getName(), dto.getVersion());
                throw new ValidationException("Feature definition with name '" + dto.getName() + "' and version '" + dto.getVersion() + "' already exists.");
            }
        }

        BeanUtils.copyProperties(dto, existingFeature, "id", "createdAt", "updatedAt");

        if (dto.getSourceDatasetId() != null) {
            Dataset dataset = datasetRepository.findById(dto.getSourceDatasetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Source Dataset not found with ID: " + dto.getSourceDatasetId()));
            existingFeature.setSourceDataset(dataset);
        } else {
            existingFeature.setSourceDataset(null); // Allow disassociating from a dataset
        }

        FeatureDefinition updatedFeature = featureDefinitionRepository.save(existingFeature);
        logger.info("Feature definition with ID {} updated successfully.", id);
        return convertToDto(updatedFeature);
    }

    /**
     * Deletes a feature definition by its ID and evicts it from the cache.
     *
     * @param id The ID of the feature definition to delete.
     * @throws ResourceNotFoundException If the feature definition is not found.
     */
    @CacheEvict(value = "featureDefinitions", key = "#id")
    @Transactional
    public void deleteFeatureDefinition(Long id) {
        logger.info("Attempting to delete feature definition with ID: {}", id);
        if (!featureDefinitionRepository.existsById(id)) {
            logger.warn("Feature definition deletion failed: Feature not found with ID: {}", id);
            throw new ResourceNotFoundException("Feature definition not found with ID: " + id);
        }
        featureDefinitionRepository.deleteById(id);
        logger.info("Feature definition with ID {} deleted successfully.", id);
    }

    /**
     * Converts a {@link FeatureDefinition} entity to a {@link FeatureDefinitionDto}.
     *
     * @param featureDefinition The FeatureDefinition entity.
     * @return The corresponding FeatureDefinitionDto.
     */
    private FeatureDefinitionDto convertToDto(FeatureDefinition featureDefinition) {
        FeatureDefinitionDto dto = new FeatureDefinitionDto();
        BeanUtils.copyProperties(featureDefinition, dto);
        if (featureDefinition.getSourceDataset() != null) {
            dto.setSourceDatasetId(featureDefinition.getSourceDataset().getId());
        }
        return dto;
    }

    /**
     * Converts a {@link FeatureDefinitionDto} to a {@link FeatureDefinition} entity.
     *
     * @param dto The FeatureDefinitionDto.
     * @return The corresponding FeatureDefinition entity.
     */
    private FeatureDefinition convertToEntity(FeatureDefinitionDto dto) {
        FeatureDefinition featureDefinition = new FeatureDefinition();
        BeanUtils.copyProperties(dto, featureDefinition);
        // SourceDataset relationship will be set separately in service methods
        return featureDefinition;
    }
}
```