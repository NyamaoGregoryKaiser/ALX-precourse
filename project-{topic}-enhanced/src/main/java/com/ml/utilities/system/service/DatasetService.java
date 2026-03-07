```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.DatasetDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.DatasetRepository;
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
public class DatasetService {

    private final DatasetRepository datasetRepository;
    private final UserRepository userRepository;

    @Transactional
    public DatasetDTO createDataset(DatasetDTO datasetDTO) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + currentUsername));

        Dataset dataset = MapperUtil.toDataset(datasetDTO);
        dataset.setCreatedBy(currentUser);
        dataset.setCreatedAt(LocalDateTime.now());
        dataset.setUpdatedAt(LocalDateTime.now());
        Dataset savedDataset = datasetRepository.save(dataset);
        log.info("Created dataset with ID: {}", savedDataset.getId());
        return MapperUtil.toDatasetDTO(savedDataset);
    }

    @Transactional(readOnly = true)
    public Optional<DatasetDTO> getDatasetById(Long id) {
        log.debug("Fetching dataset with ID: {}", id);
        return datasetRepository.findById(id)
                .map(MapperUtil::toDatasetDTO);
    }

    @Transactional(readOnly = true)
    public Page<DatasetDTO> getAllDatasets(Pageable pageable) {
        log.debug("Fetching all datasets for page {} with size {}", pageable.getPageNumber(), pageable.getPageSize());
        return datasetRepository.findAll(pageable)
                .map(MapperUtil::toDatasetDTO);
    }

    @Transactional
    public DatasetDTO updateDataset(Long id, DatasetDTO datasetDTO) {
        Dataset existingDataset = datasetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + id));

        Optional.ofNullable(datasetDTO.getName()).ifPresent(existingDataset::setName);
        Optional.ofNullable(datasetDTO.getVersion()).ifPresent(existingDataset::setVersion);
        Optional.ofNullable(datasetDTO.getSourceUri()).ifPresent(existingDataset::setSourceUri);
        Optional.ofNullable(datasetDTO.getDescription()).ifPresent(existingDataset::setDescription);
        Optional.ofNullable(datasetDTO.getSizeMb()).ifPresent(existingDataset::setSizeMb);
        Optional.ofNullable(datasetDTO.getRowCount()).ifPresent(existingDataset::setRowCount);
        Optional.ofNullable(datasetDTO.getFormat()).ifPresent(existingDataset::setFormat);
        existingDataset.setUpdatedAt(LocalDateTime.now());

        Dataset updatedDataset = datasetRepository.save(existingDataset);
        log.info("Updated dataset with ID: {}", updatedDataset.getId());
        return MapperUtil.toDatasetDTO(updatedDataset);
    }

    @Transactional
    public void deleteDataset(Long id) {
        if (!datasetRepository.existsById(id)) {
            throw new ResourceNotFoundException("Dataset not found with id: " + id);
        }
        datasetRepository.deleteById(id);
        log.info("Deleted dataset with ID: {}", id);
    }
}
```