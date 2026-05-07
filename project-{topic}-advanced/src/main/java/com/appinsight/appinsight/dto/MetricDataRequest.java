package com.appinsight.appinsight.dto;

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
public class MetricDataRequest {
    // For ingestion
    @NotBlank(message = "Metric name cannot be empty")
    private String metricName;

    @NotNull(message = "Metric value cannot be null")
    private Double value;

    // Optional for ingestion, defaults to now()
    private LocalDateTime timestamp;

    private String tags; // e.g., JSON string or comma-separated key-value pairs

    // For retrieval (output DTO)
    private Long metricId;
    private Long id; // BaseEntity ID
}