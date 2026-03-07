```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.FeatureSetDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.FeatureSet;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.DatasetRepository;
import com.ml.utilities.system.repository.FeatureSetRepository;
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
public class FeatureSetService {

    private final FeatureSetRepository featureSetRepository;
    private final DatasetRepository datasetRepository; // To link with sourceDataset
    private final UserRepository userRepository;

    @Transactional
    public FeatureSetDTO createFeatureSet(FeatureSetDTO featureSetDTO) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + currentUsername));

        FeatureSet featureSet = MapperUtil.toFeatureSet(featureSetDTO);

        if (featureSetDTO.getSourceDatasetId() != null) {
            Dataset sourceDataset = datasetRepository.findById(featureSetDTO.getSourceDatasetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Source Dataset not found with id: " + featureSetDTO.getSourceDatasetId()));
            featureSet.setSourceDataset(sourceDataset);
        }

        featureSet.setCreatedBy(currentUser);
        featureSet.setCreatedAt(LocalDateTime.now());
        featureSet.setUpdatedAt(LocalDateTime.now());
        FeatureSet savedFeatureSet = featureSetRepository.save(featureSet);
        log.info("Created feature set with ID: {}", savedFeatureSet.getId());
        return MapperUtil.toFeatureSetDTO(savedFeatureSet);
    }

    @Transactional(readOnly = true)
    public Optional<FeatureSetDTO> getFeatureSetById(Long id) {
        log.debug("Fetching feature set with ID: {}", id);
        return featureSetRepository.findById(id)
                .map(MapperUtil::toFeatureSetDTO);
    }

    @Transactional(readOnly = true)
    public Page<FeatureSetDTO> getAllFeatureSets(Pageable pageable) {
        log.debug("Fetching all feature sets for page {} with size {}", pageable.getPageNumber(), pageable.getPageSize());
        return featureSetRepository.findAll(pageable)
                .map(MapperUtil::toFeatureSetDTO);
    }

    @Transactional
    public FeatureSetDTO updateFeatureSet(Long id, FeatureSetDTO featureSetDTO) {
        FeatureSet existingFeatureSet = featureSetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feature Set not found with id: " + id));

        Optional.ofNullable(featureSetDTO.getName()).ifPresent(existingFeatureSet::setName);
        Optional.ofNullable(featureSetDTO.getVersion()).ifPresent(existingFeatureSet::setVersion);
        Optional.ofNullable(featureSetDTO.getDescription()).ifPresent(existingFeatureSet::setDescription);
        Optional.ofNullable(featureSetDTO.getTransformationCodeUri()).ifPresent(existingFeatureSet::setTransformationCodeUri);

        if (featureSetDTO.getSourceDatasetId() != null) {
            Dataset sourceDataset = datasetRepository.findById(featureSetDTO.getSourceDatasetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Source Dataset not found with id: " + featureSetDTO.getSourceDatasetId()));
            existingFeatureSet.setSourceDataset(sourceDataset);
        } else {
            existingFeatureSet.setSourceDataset(null); // Allow disassociating
        }

        existingFeatureSet.setUpdatedAt(LocalDateTime.now());
        FeatureSet updatedFeatureSet = featureSetRepository.save(existingFeatureSet);
        log.info("Updated feature set with ID: {}", updatedFeatureSet.getId());
        return MapperUtil.toFeatureSetDTO(updatedFeatureSet);
    }

    @Transactional
    public void deleteFeatureSet(Long id) {
        if (!featureSetRepository.existsById(id)) {
            throw new ResourceNotFoundException("Feature Set not found with id: " + id);
        }
        featureSetRepository.deleteById(id);
        log.info("Deleted feature set with ID: {}", id);
    }
}
```