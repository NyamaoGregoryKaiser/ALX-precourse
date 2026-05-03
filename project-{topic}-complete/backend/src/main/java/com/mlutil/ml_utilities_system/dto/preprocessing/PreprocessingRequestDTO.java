package com.mlutil.ml_utilities_system.dto.preprocessing;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreprocessingRequestDTO {

    @NotNull(message = "Dataset ID is required")
    private UUID datasetId;

    @NotEmpty(message = "At least one transformation must be specified")
    @Valid
    private List<Transformation> transformations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Transformation {
        public enum Type {
            MIN_MAX_SCALING,
            STANDARD_SCALING,
            ONE_HOT_ENCODING,
            MEAN_IMPUTATION,
            MEDIAN_IMPUTATION
        }

        @NotNull(message = "Transformation type is required")
        private Type type;

        @NotEmpty(message = "Columns for transformation cannot be empty")
        private List<String> columns;

        // Optional parameters for transformations, e.g., 'value' for imputation, or 'prefix' for OHE
        private Map<String, String> params;
    }
}