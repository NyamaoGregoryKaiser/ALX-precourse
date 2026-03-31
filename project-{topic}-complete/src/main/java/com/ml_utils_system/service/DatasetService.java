```java
package com.ml_utils_system.service;

import com.ml_utils_system.dto.DatasetDto;
import com.ml_utils_system.exception.ResourceNotFoundException;
import com.ml_utils_system.exception.ValidationException;
import com.ml_utils_system.model.Dataset;
import com.ml_utils_system.repository.DatasetRepository;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service class for managing datasets.
 * Handles business logic related to dataset creation, retrieval, update, and deletion.
 * Includes caching for performance optimization.
 */
@Service
public class DatasetService {

    private static final Logger logger = CustomLogger.getLogger(DatasetService.class);
    private static final String UPLOAD_DIR = "uploads/"; // Directory to store uploaded files

    @Autowired
    private DatasetRepository datasetRepository;

    /**
     * Uploads a dataset file and creates a new {@link Dataset} entry in the database.
     *
     * @param file The multipart file containing the dataset.
     * @param name The desired name for the dataset.
     * @param description A description of the dataset.
     * @return The created DatasetDto.
     * @throws ValidationException If a dataset with the same name already exists or file processing fails.
     */
    @Transactional
    public DatasetDto uploadDataset(MultipartFile file, String name, String description) {
        logger.info("Attempting to upload dataset: {}", name);
        if (datasetRepository.existsByName(name)) {
            logger.warn("Dataset upload failed: Dataset with name '{}' already exists.", name);
            throw new ValidationException("Dataset with name '" + name + "' already exists.");
        }

        try {
            // Ensure the upload directory exists
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate a unique file name to avoid collisions
            String originalFileName = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            }
            String storageFileName = name.replaceAll("\\s+", "_") + "_" + System.currentTimeMillis() + fileExtension;
            Path filePath = uploadPath.resolve(storageFileName);

            // Save the file to the file system
            Files.copy(file.getInputStream(), filePath);

            Dataset dataset = new Dataset();
            dataset.setName(name);
            dataset.setDescription(description);
            dataset.setStoragePath(filePath.toString());
            dataset.setFileType(fileExtension.replace(".", "").toUpperCase()); // e.g., "CSV"
            dataset.setSizeBytes(file.getSize());
            // In a real scenario, you might parse the file to get numRows and numColumns
            // For now, these are placeholders
            dataset.setNumRows(0);
            dataset.setNumColumns(0);

            Dataset savedDataset = datasetRepository.save(dataset);
            logger.info("Dataset '{}' uploaded and saved successfully with ID: {}", name, savedDataset.getId());
            return convertToDto(savedDataset);
        } catch (IOException e) {
            logger.error("Failed to store dataset file for '{}': {}", name, e.getMessage());
            throw new ValidationException("Failed to store dataset file: " + e.getMessage());
        }
    }

    /**
     * Retrieves a dataset by its ID. The result is cached.
     *
     * @param id The ID of the dataset.
     * @return The DatasetDto.
     * @throws ResourceNotFoundException If the dataset is not found.
     */
    @Cacheable(value = "datasets", key = "#id")
    @Transactional(readOnly = true)
    public DatasetDto getDatasetById(Long id) {
        logger.debug("Fetching dataset with ID: {}", id);
        Dataset dataset = datasetRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Dataset not found with ID: {}", id);
                    return new ResourceNotFoundException("Dataset not found with ID: " + id);
                });
        logger.debug("Dataset with ID {} retrieved successfully.", id);
        return convertToDto(dataset);
    }

    /**
     * Retrieves all datasets, with pagination support. The results are cached.
     *
     * @param pageable Pagination information.
     * @return A Page of DatasetDto.
     */
    @Cacheable(value = "datasets", key = "'allDatasets-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort")
    @Transactional(readOnly = true)
    public Page<DatasetDto> getAllDatasets(Pageable pageable) {
        logger.debug("Fetching all datasets for page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        Page<Dataset> datasets = datasetRepository.findAll(pageable);
        return datasets.map(this::convertToDto);
    }

    /**
     * Updates an existing dataset. The cache for this dataset is updated.
     *
     * @param id The ID of the dataset to update.
     * @param datasetDto The DTO containing updated dataset information.
     * @return The updated DatasetDto.
     * @throws ResourceNotFoundException If the dataset is not found.
     * @throws ValidationException If the new name conflicts with an existing dataset.
     */
    @CachePut(value = "datasets", key = "#id")
    @Transactional
    public DatasetDto updateDataset(Long id, DatasetDto datasetDto) {
        logger.info("Attempting to update dataset with ID: {}", id);
        Dataset existingDataset = datasetRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Dataset update failed: Dataset not found with ID: {}", id);
                    return new ResourceNotFoundException("Dataset not found with ID: " + id);
                });

        if (!existingDataset.getName().equals(datasetDto.getName()) && datasetRepository.existsByName(datasetDto.getName())) {
            logger.warn("Dataset update failed: Dataset with name '{}' already exists.", datasetDto.getName());
            throw new ValidationException("Dataset with name '" + datasetDto.getName() + "' already exists.");
        }

        BeanUtils.copyProperties(datasetDto, existingDataset, "id", "createdAt", "storagePath", "fileType", "sizeBytes");
        // For simplicity, storagePath, fileType, sizeBytes are not directly updatable via DTO here.
        // A separate method for file re-upload/replacement would be needed.

        Dataset updatedDataset = datasetRepository.save(existingDataset);
        logger.info("Dataset with ID {} updated successfully.", id);
        return convertToDto(updatedDataset);
    }

    /**
     * Deletes a dataset by its ID and evicts it from the cache.
     * Also attempts to delete the associated file from storage.
     *
     * @param id The ID of the dataset to delete.
     * @throws ResourceNotFoundException If the dataset is not found.
     */
    @CacheEvict(value = "datasets", key = "#id")
    @Transactional
    public void deleteDataset(Long id) {
        logger.info("Attempting to delete dataset with ID: {}", id);
        Dataset dataset = datasetRepository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("Dataset deletion failed: Dataset not found with ID: {}", id);
                    return new ResourceNotFoundException("Dataset not found with ID: " + id);
                });

        // Delete the physical file
        try {
            Path filePath = Paths.get(dataset.getStoragePath());
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                logger.info("Associated file '{}' for dataset ID {} deleted successfully.", dataset.getStoragePath(), id);
            } else {
                logger.warn("Associated file '{}' for dataset ID {} not found on disk, skipping file deletion.", dataset.getStoragePath(), id);
            }
        } catch (IOException e) {
            logger.error("Failed to delete associated file for dataset ID {}: {}", id, e.getMessage());
            // Continue with database deletion even if file deletion fails to maintain consistency
        }

        datasetRepository.delete(dataset);
        logger.info("Dataset with ID {} deleted successfully.", id);
    }

    /**
     * Converts a {@link Dataset} entity to a {@link DatasetDto}.
     *
     * @param dataset The Dataset entity.
     * @return The corresponding DatasetDto.
     */
    private DatasetDto convertToDto(Dataset dataset) {
        DatasetDto dto = new DatasetDto();
        BeanUtils.copyProperties(dataset, dto);
        return dto;
    }

    /**
     * Converts a {@link DatasetDto} to a {@link Dataset} entity.
     *
     * @param dto The DatasetDto.
     * @return The corresponding Dataset entity.
     */
    private Dataset convertToEntity(DatasetDto dto) {
        Dataset dataset = new Dataset();
        BeanUtils.copyProperties(dto, dataset);
        return dataset;
    }
}
```