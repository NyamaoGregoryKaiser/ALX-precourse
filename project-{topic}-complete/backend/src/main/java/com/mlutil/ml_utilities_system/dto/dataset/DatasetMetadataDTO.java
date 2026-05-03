package com.mlutil.ml_utilities_system.dto.dataset;

import com.mlutil.ml_utilities_system.model.Dataset;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatasetMetadataDTO {
    private UUID id;
    private String filename;
    private Long fileSize;
    private String fileType;
    private String ownerUsername;
    private LocalDateTime uploadDate;

    public DatasetMetadataDTO(Dataset dataset) {
        this.id = dataset.getId();
        this.filename = dataset.getFilename();
        this.fileSize = dataset.getFileSize();
        this.fileType = dataset.getFileType();
        this.ownerUsername = dataset.getOwnerUsername();
        this.uploadDate = dataset.getUploadDate();
    }
}