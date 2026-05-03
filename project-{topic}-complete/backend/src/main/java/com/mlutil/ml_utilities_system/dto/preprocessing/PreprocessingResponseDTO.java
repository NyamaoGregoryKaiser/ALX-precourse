package com.mlutil.ml_utilities_system.dto.preprocessing;

import lombok.Builder;
import lombok.Data;
import org.springframework.core.io.Resource;

import java.util.UUID;

@Data
@Builder
public class PreprocessingResponseDTO {
    private UUID datasetId;
    private String originalFilename;
    private String message;
    private Resource processedFileResource; // Temporary resource for download
}