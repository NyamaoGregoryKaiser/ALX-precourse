package com.appinsight.appinsight.dto;

import com.appinsight.appinsight.model.MetricType;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class MetricDTO {
    private Long id;

    @NotBlank(message = "Metric name is required")
    private String name;

    private String description;

    @NotNull(message = "Metric type is required")
    private MetricType type;

    private Long applicationId; // Associated application ID

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}