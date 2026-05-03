package com.mlutil.ml_utilities_system.service;

import com.mlutil.ml_utilities_system.exception.ResourceNotFoundException;
import com.mlutil.ml_utilities_system.model.Dataset;
import com.mlutil.ml_utilities_system.repository.DatasetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DatasetService {

    @Value("${application.dataset.upload-dir}")
    private String uploadDir;

    private final DatasetRepository datasetRepository;

    private Path getUploadPath() {
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory!", e);
        }
        return path;
    }

    @Transactional
    @CacheEvict(value = "datasets", key = "#ownerUsername") // Evict cache for this user's datasets
    public Dataset saveDataset(MultipartFile file, String ownerUsername) throws IOException {
        String originalFilename = Objects.requireNonNull(file.getOriginalFilename());
        String filename = UUID.randomUUID() + "_" + originalFilename; // Store with unique UUID prefix
        Path targetLocation = getUploadPath().resolve(filename);

        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        log.info("File saved to: {}", targetLocation.toString());

        Dataset dataset = Dataset.builder()
                .filename(originalFilename) // Store original filename in DB
                .filePath(targetLocation.toString()) // Store unique path on filesystem
                .fileSize(file.getSize())
                .fileType(file.getContentType())
                .ownerUsername(ownerUsername)
                .build();

        return datasetRepository.save(dataset);
    }

    @Cacheable(value = "datasets", key = "#ownerUsername")
    public List<Dataset> getDatasetsByOwner(String ownerUsername) {
        log.debug("Fetching datasets from DB for owner: {}", ownerUsername);
        return datasetRepository.findByOwnerUsername(ownerUsername);
    }

    @Cacheable(value = "datasets", key = "#id")
    public Dataset getDatasetById(UUID id) {
        log.debug("Fetching dataset from DB by ID: {}", id);
        return datasetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + id));
    }

    public Dataset getDatasetByIdAndOwner(UUID id, String ownerUsername) {
        return datasetRepository.findByIdAndOwnerUsername(id, ownerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Dataset not found with id: " + id + " for user: " + ownerUsername));
    }

    public Resource downloadDatasetFile(UUID id, String ownerUsername) throws IOException {
        Dataset dataset = getDatasetByIdAndOwner(id, ownerUsername);
        Path filePath = Paths.get(dataset.getFilePath()).normalize();
        Resource resource;
        try {
            resource = new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            throw new IOException("Error creating resource for file path: " + filePath, e);
        }
        if (!resource.exists() || !resource.isReadable()) {
            throw new IOException("File not found or not readable: " + dataset.getFilename());
        }
        return resource;
    }

    @Transactional
    @CacheEvict(value = "datasets", allEntries = true) // Clear all dataset cache entries upon deletion
    public void deleteDataset(UUID id, String ownerUsername) {
        Dataset dataset = getDatasetByIdAndOwner(id, ownerUsername);
        Path filePath = Paths.get(dataset.getFilePath());
        try {
            Files.deleteIfExists(filePath);
            log.info("File {} deleted from filesystem.", filePath);
        } catch (IOException e) {
            log.error("Failed to delete file {} from filesystem: {}", filePath, e.getMessage());
            // Optionally throw an exception, or just log if file deletion is not critical
        }
        datasetRepository.delete(dataset);
        log.info("Dataset with ID {} deleted from database.", id);
    }
}