```java
package com.ml_utils_system.service;

import com.ml_utils_system.dto.FeatureDefinitionDto;
import com.ml_utils_system.dto.ModelDto;
import com.ml_utils_system.dto.ModelVersionDto;
import com.ml_utils_system.exception.ResourceNotFoundException;
import com.ml_utils_system.exception.ValidationException;
import com.ml_utils_system.model.FeatureDefinition;
import com.ml_utils_system.model.Model;
import com.ml_utils_system.model.ModelVersion;
import com.ml_utils_system.repository.FeatureDefinitionRepository;
import com.ml_utils_system.repository.ModelRepository;
import com.ml_utils_system.repository.ModelVersionRepository;
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

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service class for managing Machine Learning Models and their versions.
 * Handles business logic for CRUD operations on models and model versions,
 * including interactions with feature definitions.
 * Includes caching for performance optimization.
 */
@Service
public class ModelService {

    private static final Logger logger = CustomLogger.getLogger(ModelService.class);

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private ModelVersionRepository modelVersionRepository;

    @Autowired
    private FeatureDefinitionRepository featureDefinitionRepository;

    /**
     * Creates a new ML model.
     *
     * @param modelDto The DTO containing the model details.
     * @return The created ModelDto.
     * @throws ValidationException If a model with the same name already exists.
     */
    @Transactional
    public ModelDto createModel(ModelDto modelDto) {
        logger.info("Attempting to create model: {}", modelDto.getName());
        if (modelRepository.existsByName(modelDto.getName())) {
            logger.warn("Model creation failed: Model with name '{}' already exists.", modelDto.getName());
            throw new ValidationException("Model with name '" + modelDto.getName() + "' already exists.");
        }

        Model model = convertToEntity(modelDto);
        Model savedModel = modelRepository.save(model);
        logger.info("Model '{}' created successfully with ID: {}", modelDto.getName(), savedModel.getId());
        return convertToDto(savedModel);
    }

    /**
     * Retrieves an ML model by its ID. The result is cached.
     *
     * @param id The ID of the model.
     * @return The ModelDto.
     * @throws ResourceNotFoundException If the model is not found.
     */
    @Cacheable(value = "models", key = "#id")
    @Transactional(readOnly = true)
    public ModelDto getModelById(Long id) {
        logger.debug("Fetching model with ID: {}", id);
        Model model = modelRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Model not found with ID: {}", id);
                    return new ResourceNotFoundException("Model not found with ID: " + id);
                });
        logger.debug("Model with ID {} retrieved successfully.", id);
        return convertToDto(model);
    }

    /**
     * Retrieves all ML models, with pagination support. The results are cached.
     *
     * @param pageable Pagination information.
     * @return A Page of ModelDto.
     */
    @Cacheable(value = "models", key = "'allModels-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort")
    @Transactional(readOnly = true)
    public Page<ModelDto> getAllModels(Pageable pageable) {
        logger.debug("Fetching all models for page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        Page<Model> models = modelRepository.findAll(pageable);
        return models.map(this::convertToDto);
    }

    /**
     * Updates an existing ML model. The cache for this model is updated.
     *
     * @param id The ID of the model to update.
     * @param modelDto The DTO containing updated model information.
     * @return The updated ModelDto.
     * @throws ResourceNotFoundException If the model is not found.
     * @throws ValidationException If the new name conflicts with an existing model.
     */
    @CachePut(value = "models", key = "#id")
    @Transactional
    public ModelDto updateModel(Long id, ModelDto modelDto) {
        logger.info("Attempting to update model with ID: {}", id);
        Model existingModel = modelRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Model update failed: Model not found with ID: {}", id);
                    return new ResourceNotFoundException("Model not found with ID: " + id);
                });

        if (!existingModel.getName().equals(modelDto.getName()) && modelRepository.existsByName(modelDto.getName())) {
            logger.warn("Model update failed: Model with name '{}' already exists.", modelDto.getName());
            throw new ValidationException("Model with name '" + modelDto.getName() + "' already exists.");
        }

        BeanUtils.copyProperties(modelDto, existingModel, "id", "createdAt", "updatedAt", "versions"); // Exclude ID and dates for copy, and versions
        Model updatedModel = modelRepository.save(existingModel);
        logger.info("Model with ID {} updated successfully.", id);
        return convertToDto(updatedModel);
    }

    /**
     * Deletes an ML model by its ID and evicts it from the cache.
     * All associated model versions will also be deleted due to cascade.
     *
     * @param id The ID of the model to delete.
     * @throws ResourceNotFoundException If the model is not found.
     */
    @CacheEvict(value = "models", key = "#id")
    @Transactional
    public void deleteModel(Long id) {
        logger.info("Attempting to delete model with ID: {}", id);
        if (!modelRepository.existsById(id)) {
            logger.warn("Model deletion failed: Model not found with ID: {}", id);
            throw new ResourceNotFoundException("Model not found with ID: " + id);
        }
        modelRepository.deleteById(id);
        logger.info("Model with ID {} deleted successfully, along with its versions.", id);
    }

    // --- Model Version Operations ---

    /**
     * Creates a new version for an existing ML model.
     *
     * @param modelId The ID of the parent model.
     * @param versionDto The DTO containing the model version details.
     * @return The created ModelVersionDto.
     * @throws ResourceNotFoundException If the parent model is not found.
     * @throws ValidationException If a version with the same number already exists for the model.
     */
    @CacheEvict(value = "models", key = "#modelId", allEntries = false) // Evict parent model from cache
    @Transactional
    public ModelVersionDto createModelVersion(Long modelId, ModelVersionDto versionDto) {
        logger.info("Attempting to create version '{}' for model ID: {}", versionDto.getVersionNumber(), modelId);
        Model model = modelRepository.findById(modelId)
                .orElseThrow(() -> {
                    logger.warn("Model version creation failed: Parent model not found with ID: {}", modelId);
                    return new ResourceNotFoundException("Parent model not found with ID: " + modelId);
                });

        if (modelVersionRepository.existsByModelIdAndVersionNumber(modelId, versionDto.getVersionNumber())) {
            logger.warn("Model version creation failed: Version '{}' already exists for model ID: {}.", versionDto.getVersionNumber(), modelId);
            throw new ValidationException("Version '" + versionDto.getVersionNumber() + "' already exists for model ID: " + modelId);
        }

        ModelVersion modelVersion = convertToEntity(versionDto);
        modelVersion.setModel(model);

        // Associate features if feature IDs are provided
        if (versionDto.getFeatureIds() != null && !versionDto.getFeatureIds().isEmpty()) {
            Set<FeatureDefinition> features = new HashSet<>();
            for (Long featureId : versionDto.getFeatureIds()) {
                FeatureDefinition feature = featureDefinitionRepository.findById(featureId)
                        .orElseThrow(() -> new ResourceNotFoundException("FeatureDefinition not found with ID: " + featureId));
                features.add(feature);
            }
            modelVersion.setFeatures(features);
        }

        ModelVersion savedVersion = modelVersionRepository.save(modelVersion);
        logger.info("Model version '{}' created successfully for model ID: {}", savedVersion.getVersionNumber(), modelId);
        return convertToDto(savedVersion);
    }

    /**
     * Retrieves a specific model version by its ID. The result is cached.
     * Eagerly fetches associated features to avoid N+1 problem.
     *
     * @param id The ID of the model version.
     * @return The ModelVersionDto.
     * @throws ResourceNotFoundException If the model version is not found.
     */
    @Cacheable(value = "modelVersion", key = "#id")
    @Transactional(readOnly = true)
    public ModelVersionDto getModelVersionById(Long id) {
        logger.debug("Fetching model version with ID: {}", id);
        ModelVersion modelVersion = modelVersionRepository.findById(id) // Uses @EntityGraph for eager loading
                .orElseThrow(() -> {
                    logger.warn("Model version not found with ID: {}", id);
                    return new ResourceNotFoundException("Model version not found with ID: " + id);
                });
        logger.debug("Model version with ID {} retrieved successfully.", id);
        return convertToDto(modelVersion);
    }

    /**
     * Retrieves all versions for a given model ID. The results are cached.
     *
     * @param modelId The ID of the parent model.
     * @return A list of ModelVersionDto.
     * @throws ResourceNotFoundException If the parent model is not found.
     */
    @Cacheable(value = "modelVersionsByModel", key = "#modelId")
    @Transactional(readOnly = true)
    public List<ModelVersionDto> getModelVersionsByModelId(Long modelId) {
        logger.debug("Fetching all versions for model ID: {}", modelId);
        if (!modelRepository.existsById(modelId)) {
            throw new ResourceNotFoundException("Model not found with ID: " + modelId);
        }
        List<ModelVersion> versions = modelVersionRepository.findByModelId(modelId);
        logger.debug("Retrieved {} versions for model ID: {}", versions.size(), modelId);
        return versions.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing model version. The cache for this model version is updated.
     *
     * @param id The ID of the model version to update.
     * @param versionDto The DTO containing updated model version information.
     * @return The updated ModelVersionDto.
     * @throws ResourceNotFoundException If the model version or associated features are not found.
     * @throws ValidationException If the new version number conflicts with an existing version for the same model.
     */
    @CachePut(value = "modelVersion", key = "#id")
    @CacheEvict(value = "modelVersionsByModel", key = "#versionDto.modelId", allEntries = false) // Evict list of versions for this model
    @Transactional
    public ModelVersionDto updateModelVersion(Long id, ModelVersionDto versionDto) {
        logger.info("Attempting to update model version with ID: {}", id);
        ModelVersion existingVersion = modelVersionRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Model version update failed: Model version not found with ID: {}", id);
                    return new ResourceNotFoundException("Model version not found with ID: " + id);
                });

        // Check if modelId in DTO matches existing (should not change parent model)
        if (!existingVersion.getModel().getId().equals(versionDto.getModelId())) {
            throw new ValidationException("Model ID in DTO must match existing model version's parent model ID.");
        }

        // Check for duplicate version number if it changes
        if (!existingVersion.getVersionNumber().equals(versionDto.getVersionNumber()) &&
                modelVersionRepository.existsByModelIdAndVersionNumber(existingVersion.getModel().getId(), versionDto.getVersionNumber())) {
            logger.warn("Model version update failed: Version '{}' already exists for model ID: {}.", versionDto.getVersionNumber(), existingVersion.getModel().getId());
            throw new ValidationException("Version '" + versionDto.getVersionNumber() + "' already exists for model ID: " + existingVersion.getModel().getId());
        }

        BeanUtils.copyProperties(versionDto, existingVersion, "id", "modelId", "createdAt", "updatedAt", "features"); // Exclude ID, modelId, dates, and features for copy

        // Update deployedAt if deploymentStatus changes to "Production" or similar
        if ("Production".equalsIgnoreCase(versionDto.getDeploymentStatus()) && existingVersion.getDeployedAt() == null) {
            existingVersion.setDeployedAt(LocalDateTime.now());
        } else if (!"Production".equalsIgnoreCase(versionDto.getDeploymentStatus())) {
            existingVersion.setDeployedAt(null); // Clear deployed date if no longer production
        }

        // Update features
        if (versionDto.getFeatureIds() != null) {
            Set<FeatureDefinition> newFeatures = new HashSet<>();
            for (Long featureId : versionDto.getFeatureIds()) {
                FeatureDefinition feature = featureDefinitionRepository.findById(featureId)
                        .orElseThrow(() -> new ResourceNotFoundException("FeatureDefinition not found with ID: " + featureId));
                newFeatures.add(feature);
            }
            existingVersion.setFeatures(newFeatures);
        } else {
            existingVersion.setFeatures(new HashSet<>()); // Clear features if none are provided
        }


        ModelVersion updatedVersion = modelVersionRepository.save(existingVersion);
        logger.info("Model version with ID {} updated successfully.", id);
        return convertToDto(updatedVersion);
    }

    /**
     * Deletes a model version by its ID and evicts it from the cache.
     * Also evicts the parent model's list of versions from cache.
     *
     * @param id The ID of the model version to delete.
     * @throws ResourceNotFoundException If the model version is not found.
     */
    @CacheEvict(value = {"modelVersion", "modelVersionsByModel"}, key = "#id")
    @Transactional
    public void deleteModelVersion(Long id) {
        logger.info("Attempting to delete model version with ID: {}", id);
        ModelVersion versionToDelete = modelVersionRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Model version deletion failed: Model version not found with ID: {}", id);
                    return new ResourceNotFoundException("Model version not found with ID: " + id);
                });
        modelVersionRepository.deleteById(id);
        logger.info("Model version with ID {} deleted successfully.", id);
    }

    /**
     * Converts a {@link Model} entity to a {@link ModelDto}.
     * Optionally includes a list of {@link ModelVersionDto} for its versions.
     *
     * @param model The Model entity.
     * @return The corresponding ModelDto.
     */
    private ModelDto convertToDto(Model model) {
        ModelDto dto = new ModelDto();
        BeanUtils.copyProperties(model, dto);
        if (model.getVersions() != null && !model.getVersions().isEmpty()) {
            dto.setVersions(model.getVersions().stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    /**
     * Converts a {@link ModelDto} to a {@link Model} entity.
     *
     * @param dto The ModelDto.
     * @return The corresponding Model entity.
     */
    private Model convertToEntity(ModelDto dto) {
        Model model = new Model();
        BeanUtils.copyProperties(dto, model, "versions"); // Exclude versions from direct copy
        return model;
    }

    /**
     * Converts a {@link ModelVersion} entity to a {@link ModelVersionDto}.
     *
     * @param modelVersion The ModelVersion entity.
     * @return The corresponding ModelVersionDto.
     */
    private ModelVersionDto convertToDto(ModelVersion modelVersion) {
        ModelVersionDto dto = new ModelVersionDto();
        BeanUtils.copyProperties(modelVersion, dto);
        dto.setModelId(modelVersion.getModel().getId());
        if (modelVersion.getFeatures() != null) {
            dto.setFeatureIds(modelVersion.getFeatures().stream()
                    .map(FeatureDefinition::getId)
                    .collect(Collectors.toSet()));
        }
        return dto;
    }

    /**
     * Converts a {@link ModelVersionDto} to a {@link ModelVersion} entity.
     *
     * @param dto The ModelVersionDto.
     * @return The corresponding ModelVersion entity.
     */
    private ModelVersion convertToEntity(ModelVersionDto dto) {
        ModelVersion modelVersion = new ModelVersion();
        BeanUtils.copyProperties(dto, modelVersion, "modelId", "features"); // Exclude modelId and features for direct copy
        // Model and Features relations will be set separately in service methods
        return modelVersion;
    }
}
```