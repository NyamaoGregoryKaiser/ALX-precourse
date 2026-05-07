package com.appinsight.appinsight.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MonitoredApplicationDTO {
    private Long id;

    @NotBlank(message = "Application name is required")
    private String name;

    private String description;

    private String apiKey; // Will be generated on creation

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}