```java
package com.ml.utilities.system.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Data Transfer Object for ML Dataset details")
public class DatasetDTO {

    @Schema(description = "Unique ID of the dataset", example = "1")
    private Long id;

    @NotBlank(message = "Dataset name cannot be empty")
    @Size(max = 255, message = "Dataset name cannot exceed 255 characters")
    @Schema(description = "Name of the dataset", example = "Telecom Churn Raw Data")
    private String name;

    @NotBlank(message = "Dataset version cannot be empty")
    @Size(max = 50, message = "Dataset version cannot exceed 50 characters")
    @Schema(description = "Version of the dataset", example = "2.1")
    private String version;

    @Size(max = 1000, message = "Source URI cannot exceed 1000 characters")
    @Schema(description = "URI where the raw dataset is stored (e.g., S3 path, HDFS path)", example = "s3://raw-data/telecom/churn_2023_Q1.csv")
    private String sourceUri;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    @Schema(description = "Brief description of the dataset", example = "Raw customer data from Q1 2023 for churn analysis.")
    private String description;

    @Min(value = 0, message = "Size in MB cannot be negative")
    @Schema(description = "Size of the dataset in megabytes", example = "1024")
    private Long sizeMb;

    @Min(value = 0, message = "Row count cannot be negative")
    @Schema(description = "Number of rows in the dataset", example = "1000000")
    private Long rowCount;

    @Size(max = 50, message = "Format cannot exceed 50 characters")
    @Schema(description = "Format of the dataset (e.g., CSV, Parquet, JSON)", example = "Parquet")
    private String format;

    @Schema(description = "Timestamp when the dataset was registered", example = "2023-01-10T08:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "Timestamp when the dataset was last updated", example = "2023-01-10T08:00:00")
    private LocalDateTime updatedAt;

    @Schema(description = "ID of the user who registered the dataset", example = "101")
    private Long createdByUserId;
}
```