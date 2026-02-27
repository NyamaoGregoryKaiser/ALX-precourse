```java
package com.alx.webscraper.model.util;

import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.model.ScrapedData;
import com.alx.webscraper.model.ScrapingTask;
import com.alx.webscraper.model.dto.ScrapedDataDTO;
import com.alx.webscraper.model.dto.ScrapingTaskCreateDTO;
import com.alx.webscraper.model.dto.ScrapingTaskResponseDTO;
import com.alx.webscraper.model.dto.ScrapingTaskUpdateDTO;

import java.time.LocalDateTime;

/**
 * Utility class for mapping between JPA entities and DTOs.
 * Helps keep controllers and services clean by centralizing mapping logic.
 */
public class MappingUtil {

    /**
     * Maps a ScrapingTaskCreateDTO to a ScrapingTask entity.
     *
     * @param createDTO The DTO containing new task data.
     * @param user      The user creating the task.
     * @return A new ScrapingTask entity.
     */
    public static ScrapingTask toEntity(ScrapingTaskCreateDTO createDTO, User user) {
        ScrapingTask task = new ScrapingTask();
        task.setName(createDTO.getName());
        task.setTargetUrl(createDTO.getTargetUrl());
        task.setDataFields(createDTO.getDataFields());
        task.setCronExpression(createDTO.getCronExpression());
        task.setUser(user);
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        // Status is set to PENDING by @PrePersist
        return task;
    }

    /**
     * Updates an existing ScrapingTask entity with data from a ScrapingTaskUpdateDTO.
     *
     * @param existingTask The existing task entity to update.
     * @param updateDTO    The DTO containing updated task data.
     */
    public static void updateEntityFromDto(ScrapingTask existingTask, ScrapingTaskUpdateDTO updateDTO) {
        if (updateDTO.getName() != null && !updateDTO.getName().isBlank()) {
            existingTask.setName(updateDTO.getName());
        }
        if (updateDTO.getTargetUrl() != null && !updateDTO.getTargetUrl().isBlank()) {
            existingTask.setTargetUrl(updateDTO.getTargetUrl());
        }
        if (updateDTO.getDataFields() != null && !updateDTO.getDataFields().isEmpty()) {
            existingTask.setDataFields(updateDTO.getDataFields());
        }
        if (updateDTO.getStatus() != null) {
            existingTask.setStatus(updateDTO.getStatus());
        }
        if (updateDTO.getCronExpression() != null) {
            existingTask.setCronExpression(updateDTO.getCronExpression());
        }
        existingTask.setUpdatedAt(LocalDateTime.now());
    }

    /**
     * Maps a ScrapingTask entity to a ScrapingTaskResponseDTO.
     *
     * @param task The ScrapingTask entity.
     * @return A ScrapingTaskResponseDTO.
     */
    public static ScrapingTaskResponseDTO toDto(ScrapingTask task) {
        return new ScrapingTaskResponseDTO(
                task.getId(),
                task.getName(),
                task.getTargetUrl(),
                task.getDataFields(),
                task.getStatus(),
                task.getCronExpression(),
                task.getCreatedAt(),
                task.getUpdatedAt(),
                task.getLastRunAt(),
                task.getLastRunMessage(),
                task.getUser().getId() // Only expose the user's ID
        );
    }

    /**
     * Maps a ScrapedData entity to a ScrapedDataDTO.
     *
     * @param scrapedData The ScrapedData entity.
     * @return A ScrapedDataDTO.
     */
    public static ScrapedDataDTO toDto(ScrapedData scrapedData) {
        return new ScrapedDataDTO(
                scrapedData.getId(),
                scrapedData.getScrapingTask().getId(),
                scrapedData.getData(),
                scrapedData.getScrapedAt(),
                scrapedData.getSourceUrl()
        );
    }
}
```