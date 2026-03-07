```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.ExperimentDTO;
import com.ml.utilities.system.exception.ResourceNotFoundException;
import com.ml.utilities.system.model.Experiment;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.ExperimentRepository;
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
public class ExperimentService {

    private final ExperimentRepository experimentRepository;
    private final UserRepository userRepository; // To link with createdBy user

    @Transactional
    public ExperimentDTO createExperiment(ExperimentDTO experimentDTO) {
        // Get the currently authenticated user's username
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found: " + currentUsername));

        Experiment experiment = MapperUtil.toExperiment(experimentDTO);
        experiment.setCreatedBy(currentUser);
        experiment.setCreatedAt(LocalDateTime.now());
        experiment.setUpdatedAt(LocalDateTime.now());
        Experiment savedExperiment = experimentRepository.save(experiment);
        log.info("Created experiment with ID: {}", savedExperiment.getId());
        return MapperUtil.toExperimentDTO(savedExperiment);
    }

    @Transactional(readOnly = true)
    public Optional<ExperimentDTO> getExperimentById(Long id) {
        log.debug("Fetching experiment with ID: {}", id);
        return experimentRepository.findById(id)
                .map(MapperUtil::toExperimentDTO);
    }

    @Transactional(readOnly = true)
    public Page<ExperimentDTO> getAllExperiments(Pageable pageable) {
        log.debug("Fetching all experiments for page {} with size {}", pageable.getPageNumber(), pageable.getPageSize());
        return experimentRepository.findAll(pageable)
                .map(MapperUtil::toExperimentDTO);
    }

    @Transactional
    public ExperimentDTO updateExperiment(Long id, ExperimentDTO experimentDTO) {
        Experiment existingExperiment = experimentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experiment not found with id: " + id));

        // Update fields from DTO, if provided
        Optional.ofNullable(experimentDTO.getName()).ifPresent(existingExperiment::setName);
        Optional.ofNullable(experimentDTO.getDescription()).ifPresent(existingExperiment::setDescription);
        Optional.ofNullable(experimentDTO.getStartDate()).ifPresent(existingExperiment::setStartDate);
        Optional.ofNullable(experimentDTO.getEndDate()).ifPresent(existingExperiment::setEndDate);
        Optional.ofNullable(experimentDTO.getStatus()).ifPresent(existingExperiment::setStatus);
        Optional.ofNullable(experimentDTO.getObjective()).ifPresent(existingExperiment::setObjective);
        existingExperiment.setUpdatedAt(LocalDateTime.now());

        Experiment updatedExperiment = experimentRepository.save(existingExperiment);
        log.info("Updated experiment with ID: {}", updatedExperiment.getId());
        return MapperUtil.toExperimentDTO(updatedExperiment);
    }

    @Transactional
    public void deleteExperiment(Long id) {
        if (!experimentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Experiment not found with id: " + id);
        }
        experimentRepository.deleteById(id);
        log.info("Deleted experiment with ID: {}", id);
    }
}
```