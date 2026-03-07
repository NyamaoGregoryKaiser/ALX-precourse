```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.ModelDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.Experiment;
import com.ml.utilities.system.model.FeatureSet;
import com.ml.utilities.system.model.Model;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.DatasetRepository;
import com.ml.utilities.system.repository.ExperimentRepository;
import com.ml.utilities.system.repository.FeatureSetRepository;
import com.ml.utilities.system.repository.ModelRepository;
import com.ml.utilities.system.repository.UserRepository;
import com.ml.utilities.system.util.MapperUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModelService {

    private final ModelRepository modelRepository;
    private final ExperimentRepository experimentRepository;
    private final DatasetRepository datasetRepository;
    private final FeatureSetRepository featureSetRepository;
    private final UserRepository userRepository;

    @Transactional
    public ModelDTO createModel(ModelDTO modelDTO) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + currentUsername));

        Model model = MapperUtil.toModel(modelDTO);

        if (modelDTO.getExperimentId() != null) {
            Experiment experiment = experimentRepository.findById(modelDTO.getExperimentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Experiment not found with id: " + modelDTO.getExperimentId()));
            model.setExperiment(experiment);
        }
        if (modelDTO.getDatasetId() != null) {
            Dataset dataset = datasetRepository.findById(modelDTO.getDatasetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + modelDTO.getDatasetId()));
            model.setDataset(dataset);
        }
        if (modelDTO.getFeatureSetId() != null) {
            FeatureSet featureSet = featureSetRepository.findById(modelDTO.getFeatureSetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Feature Set not found with id: " + modelDTO.getFeatureSetId()));
            model.setFeatureSet(featureSet);
        }

        model.setCreatedBy(currentUser);
        model.setCreatedAt(LocalDateTime.now());
        model.setUpdatedAt(LocalDateTime.now());
        Model savedModel = modelRepository.save(model);
        log.info("Created model with ID: {}", savedModel.getId());
        return MapperUtil.toModelDTO(savedModel);
    }

    @Transactional(readOnly = true)
    public Optional<ModelDTO> getModelById(Long id) {
        log.debug("Fetching model with ID: {}", id);
        return modelRepository.findById(id)
                .map(MapperUtil::toModelDTO);
    }

    @Transactional(readOnly = true)
    public Page<ModelDTO> getAllModels(Pageable pageable) {
        log.debug("Fetching all models for page {} with size {}", pageable.getPageNumber(), pageable.getPageSize());
        return modelRepository.findAll(pageable)
                .map(MapperUtil::toModelDTO);
    }

    @Transactional
    public ModelDTO updateModel(Long id, ModelDTO modelDTO) {
        Model existingModel = modelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Model not found with id: " + id));

        Optional.ofNullable(modelDTO.getName()).ifPresent(existingModel::setName);
        Optional.ofNullable(modelDTO.getVersion()).ifPresent(existingModel::setVersion);
        Optional.ofNullable(modelDTO.getModelUri()).ifPresent(existingModel::setModelUri);
        Optional.ofNullable(modelDTO.getFramework()).ifPresent(existingModel::setFramework);
        Optional.ofNullable(modelDTO.getAccuracy()).ifPresent(existingModel::setAccuracy);
        Optional.ofNullable(modelDTO.getF1Score()).ifPresent(existingModel::setF1Score);
        Optional.ofNullable(modelDTO.getPrecisionScore()).ifPresent(existingModel::setPrecisionScore);
        Optional.ofNullable(modelDTO.getRecallScore()).ifPresent(existingModel::setRecallScore);

        if (modelDTO.getExperimentId() != null) {
            Experiment experiment = experimentRepository.findById(modelDTO.getExperimentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Experiment not found with id: " + modelDTO.getExperimentId()));
            existingModel.setExperiment(experiment);
        } else {
            existingModel.setExperiment(null); // Allow disassociating
        }
        if (modelDTO.getDatasetId() != null) {
            Dataset dataset = datasetRepository.findById(modelDTO.getDatasetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + modelDTO.getDatasetId()));
            existingModel.setDataset(dataset);
        } else {
            existingModel.setDataset(null);
        }
        if (modelDTO.getFeatureSetId() != null) {
            FeatureSet featureSet = featureSetRepository.findById(modelDTO.getFeatureSetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Feature Set not found with id: " + modelDTO.getFeatureSetId()));
            existingModel.setFeatureSet(featureSet);
        } else {
            existingModel.setFeatureSet(null);
        }

        existingModel.setUpdatedAt(LocalDateTime.now());
        Model updatedModel = modelRepository.save(existingModel);
        log.info("Updated model with ID: {}", updatedModel.getId());
        return MapperUtil.toModelDTO(updatedModel);
    }

    @Transactional
    public void deleteModel(Long id) {
        if (!modelRepository.existsById(id)) {
            throw new ResourceNotFoundException("Model not found with id: " + id);
        }
        modelRepository.deleteById(id);
        log.info("Deleted model with ID: {}", id);
    }
}
```