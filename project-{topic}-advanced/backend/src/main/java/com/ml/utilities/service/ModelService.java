```java
package com.ml.utilities.service;

import com.ml.utilities.dto.ModelDTO;
import com.ml.utilities.dto.ModelVersionDTO;
import com.ml.utilities.entity.Model;
import com.ml.utilities.entity.ModelVersion;
import com.ml.utilities.exception.ResourceNotFoundException;
import com.ml.utilities.repository.ModelRepository;
import com.ml.utilities.repository.ModelVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModelService {

    private final ModelRepository modelRepository;
    private final ModelVersionRepository modelVersionRepository;

    public List<ModelDTO> getAllModels() {
        return modelRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "models", key = "#id")
    public ModelDTO getModelById(Long id) {
        Model model = modelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Model not found with id: " + id));
        return convertToDto(model);
    }

    @Transactional
    public ModelDTO createModel(ModelDTO modelDTO) {
        if (modelRepository.findByName(modelDTO.getName()).isPresent()) {
            throw new IllegalArgumentException("Model with name " + modelDTO.getName() + " already exists.");
        }
        Model model = convertToEntity(modelDTO);
        return convertToDto(modelRepository.save(model));
    }

    @Transactional
    @CachePut(value = "models", key = "#id")
    public ModelDTO updateModel(Long id, ModelDTO modelDTO) {
        Model existingModel = modelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Model not found with id: " + id));

        // Check for unique name if changing
        if (!existingModel.getName().equals(modelDTO.getName()) && modelRepository.findByName(modelDTO.getName()).isPresent()) {
            throw new IllegalArgumentException("Model with name " + modelDTO.getName() + " already exists.");
        }

        existingModel.setName(modelDTO.getName());
        existingModel.setDescription(modelDTO.getDescription());
        existingModel.setType(modelDTO.getType());
        return convertToDto(modelRepository.save(existingModel));
    }

    @Transactional
    @CacheEvict(value = "models", key = "#id")
    public void deleteModel(Long id) {
        if (!modelRepository.existsById(id)) {
            throw new ResourceNotFoundException("Model not found with id: " + id);
        }
        modelRepository.deleteById(id);
    }

    // Model Versions
    public List<ModelVersionDTO> getModelVersions(Long modelId) {
        if (!modelRepository.existsById(modelId)) {
            throw new ResourceNotFoundException("Model not found with id: " + modelId);
        }
        return modelVersionRepository.findByModelId(modelId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "modelVersions", key = "#versionId")
    public ModelVersionDTO getModelVersionById(Long modelId, Long versionId) {
        ModelVersion version = modelVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Model version not found with id: " + versionId));
        if (!version.getModel().getId().equals(modelId)) {
            throw new IllegalArgumentException("Model version " + versionId + " does not belong to model " + modelId);
        }
        return convertToDto(version);
    }

    @Transactional
    @CacheEvict(value = {"modelVersions"}, allEntries = true) // Evict all model version caches on new version
    public ModelVersionDTO addModelVersion(Long modelId, ModelVersionDTO versionDTO) {
        Model model = modelRepository.findById(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("Model not found with id: " + modelId));

        if (modelVersionRepository.findByModelIdAndVersionNumber(modelId, versionDTO.getVersionNumber()).isPresent()) {
            throw new IllegalArgumentException("Version number " + versionDTO.getVersionNumber() + " already exists for model " + modelId);
        }

        ModelVersion version = convertToEntity(versionDTO);
        version.setModel(model);

        // If this version is marked as default, unset others
        if (version.isDefault()) {
            modelVersionRepository.findByModelId(modelId)
                    .forEach(v -> {
                        if (v.isDefault()) {
                            v.setDefault(false);
                            modelVersionRepository.save(v);
                        }
                    });
        } else {
            // If no default exists and this is the first, make it default
            if (modelVersionRepository.findByModelIdAndIsDefaultTrue(modelId).isEmpty() && modelVersionRepository.findByModelId(modelId).isEmpty()) {
                version.setDefault(true);
            }
        }

        return convertToDto(modelVersionRepository.save(version));
    }

    @Transactional
    @CacheEvict(value = {"modelVersions"}, allEntries = true) // Evict all model version caches on update
    public ModelVersionDTO updateModelVersion(Long modelId, Long versionId, ModelVersionDTO versionDTO) {
        ModelVersion existingVersion = modelVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Model version not found with id: " + versionId));

        if (!existingVersion.getModel().getId().equals(modelId)) {
            throw new IllegalArgumentException("Model version " + versionId + " does not belong to model " + modelId);
        }

        // Check for unique version number if changing
        if (!existingVersion.getVersionNumber().equals(versionDTO.getVersionNumber())) {
            if (modelVersionRepository.findByModelIdAndVersionNumber(modelId, versionDTO.getVersionNumber()).isPresent()) {
                throw new IllegalArgumentException("Version number " + versionDTO.getVersionNumber() + " already exists for model " + modelId);
            }
        }

        existingVersion.setVersionNumber(versionDTO.getVersionNumber());
        existingVersion.setModelPath(versionDTO.getModelPath());
        existingVersion.setMetadata(versionDTO.getMetadata());

        if (versionDTO.isDefault()) {
            // If setting this as default, unset others
            modelVersionRepository.findByModelId(modelId)
                    .forEach(v -> {
                        if (v.isDefault() && !v.getId().equals(versionId)) {
                            v.setDefault(false);
                            modelVersionRepository.save(v);
                        }
                    });
            existingVersion.setDefault(true);
        } else if (existingVersion.isDefault() && !versionDTO.isDefault()) {
            // If unsetting a default version, ensure at least one default exists or mark another one as default
            List<ModelVersion> otherVersions = modelVersionRepository.findByModelId(modelId).stream()
                    .filter(v -> !v.getId().equals(versionId))
                    .collect(Collectors.toList());
            if (otherVersions.isEmpty()) {
                // If this is the only version, it must remain default or a new default must be chosen later.
                // For now, disallow unsetting if it's the last one.
                throw new IllegalArgumentException("Cannot unset default for the only version of a model. Delete the model or add another version first.");
            } else {
                // Try to find another default, if not, choose the latest one
                Optional<ModelVersion> existingDefault = otherVersions.stream().filter(ModelVersion::isDefault).findFirst();
                if (existingDefault.isEmpty()) {
                    otherVersions.stream()
                            .max((v1, v2) -> v1.getCreatedAt().compareTo(v2.getCreatedAt())) // Get latest by creation date
                            .ifPresent(latest -> {
                                latest.setDefault(true);
                                modelVersionRepository.save(latest);
                            });
                }
                existingVersion.setDefault(false);
            }
        }


        return convertToDto(modelVersionRepository.save(existingVersion));
    }

    @Transactional
    @CacheEvict(value = {"modelVersions"}, allEntries = true) // Evict all model version caches on delete
    public void deleteModelVersion(Long modelId, Long versionId) {
        ModelVersion version = modelVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Model version not found with id: " + versionId));

        if (!version.getModel().getId().equals(modelId)) {
            throw new IllegalArgumentException("Model version " + versionId + " does not belong to model " + modelId);
        }

        if (version.isDefault()) {
            List<ModelVersion> otherVersions = modelVersionRepository.findByModelId(modelId).stream()
                    .filter(v -> !v.getId().equals(versionId))
                    .collect(Collectors.toList());
            if (!otherVersions.isEmpty()) {
                otherVersions.stream()
                        .max((v1, v2) -> v1.getCreatedAt().compareTo(v2.getCreatedAt())) // Choose latest
                        .ifPresent(latest -> {
                            latest.setDefault(true);
                            modelVersionRepository.save(latest);
                        });
            }
        }
        modelVersionRepository.delete(version);
    }

    private ModelDTO convertToDto(Model model) {
        return ModelDTO.builder()
                .id(model.getId())
                .name(model.getName())
                .description(model.getDescription())
                .type(model.getType())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .versions(model.getVersions() != null ? model.getVersions().stream().map(this::convertToDto).collect(Collectors.toList()) : null)
                .build();
    }

    private Model convertToEntity(ModelDTO modelDTO) {
        return Model.builder()
                .name(modelDTO.getName())
                .description(modelDTO.getDescription())
                .type(modelDTO.getType())
                .build();
    }

    private ModelVersionDTO convertToDto(ModelVersion version) {
        return ModelVersionDTO.builder()
                .id(version.getId())
                .modelId(version.getModel().getId())
                .versionNumber(version.getVersionNumber())
                .modelPath(version.getModelPath())
                .metadata(version.getMetadata())
                .isDefault(version.isDefault())
                .createdAt(version.getCreatedAt())
                .updatedAt(version.getUpdatedAt())
                .build();
    }

    private ModelVersion convertToEntity(ModelVersionDTO versionDTO) {
        return ModelVersion.builder()
                .versionNumber(versionDTO.getVersionNumber())
                .modelPath(versionDTO.getModelPath())
                .metadata(versionDTO.getMetadata())
                .isDefault(versionDTO.isDefault())
                .build();
    }
}
```