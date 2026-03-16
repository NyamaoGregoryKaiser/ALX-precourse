```java
package com.alx.scrapineer.api.dto.scraping;

import com.alx.scrapineer.data.entity.CssSelector;
import com.alx.scrapineer.data.entity.ScrapingJob;
import com.alx.scrapineer.data.entity.ScrapingResult;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Mapper component for converting between DTOs and Entities for scraping-related objects.
 */
@Component
public class ScrapingTargetMapping {

    public ScrapingTargetDto toDto(ScrapingTarget entity) {
        return ScrapingTargetDto.builder()
                .id(entity.getId())
                .userId(entity.getUser().getId())
                .name(entity.getName())
                .url(entity.getUrl())
                .description(entity.getDescription())
                .active(entity.isActive())
                .selectors(Optional.ofNullable(entity.getSelectors())
                        .orElse(Collections.emptyList())
                        .stream()
                        .map(this::toDto)
                        .collect(Collectors.toList()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public ScrapingTarget toEntity(ScrapingTargetDto dto) {
        // Note: User will be set separately in the service layer
        // Selectors will also be linked in the service layer
        return ScrapingTarget.builder()
                .id(dto.getId())
                .name(dto.getName())
                .url(dto.getUrl())
                .description(dto.getDescription())
                .active(dto.isActive())
                .build();
    }

    public CssSelectorDto toDto(CssSelector entity) {
        return CssSelectorDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .selectorValue(entity.getSelectorValue())
                .type(entity.getType())
                .attributeName(entity.getAttributeName())
                .build();
    }

    public CssSelector toEntity(CssSelectorDto dto) {
        return CssSelector.builder()
                .id(dto.getId())
                .name(dto.getName())
                .selectorValue(dto.getSelectorValue())
                .type(dto.getType())
                .attributeName(dto.getAttributeName())
                .build();
    }

    public ScrapingJobDto toDto(ScrapingJob entity) {
        return ScrapingJobDto.builder()
                .id(entity.getId())
                .targetId(entity.getTarget().getId())
                .targetName(entity.getTarget().getName()) // Include target name for convenience
                .userId(entity.getUser().getId())
                .status(entity.getStatus())
                .scheduleCron(entity.getScheduleCron())
                .lastRunAt(entity.getLastRunAt())
                .nextRunAt(entity.getNextRunAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public ScrapingJob toEntity(ScrapingJobDto dto) {
        // Note: User and Target will be set separately in the service layer
        return ScrapingJob.builder()
                .id(dto.getId())
                .status(dto.getStatus())
                .scheduleCron(dto.getScheduleCron())
                .lastRunAt(dto.getLastRunAt())
                .nextRunAt(dto.getNextRunAt())
                .build();
    }

    public ScrapingResultDto toDto(ScrapingResult entity) {
        return ScrapingResultDto.builder()
                .id(entity.getId())
                .jobId(entity.getJob().getId())
                .targetId(entity.getTarget().getId())
                .extractedData(entity.getExtractedData())
                .successful(entity.isSuccessful())
                .errorMessage(entity.getErrorMessage())
                .timestamp(entity.getTimestamp())
                .build();
    }
}
```