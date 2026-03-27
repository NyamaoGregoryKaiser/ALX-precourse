```java
package com.ml.utilities.controller;

import com.ml.utilities.dto.PredictionRequest;
import com.ml.utilities.dto.PredictionResponse;
import com.ml.utilities.service.InferenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inference")
@RequiredArgsConstructor
@Tag(name = "ML Inference", description = "API for requesting predictions from deployed ML models")
public class InferenceController {

    private final InferenceService inferenceService;

    @Operation(summary = "Get prediction from a specific model version",
               description = "Sends input data to a specific version of an ML model and retrieves a prediction.")
    @PostMapping("/{modelId}/versions/{versionId}/predict")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<PredictionResponse> predictSpecificVersion(@Parameter(description = "ID of the model") @PathVariable Long modelId,
                                                                     @Parameter(description = "ID of the model version") @PathVariable Long versionId,
                                                                     @Valid @RequestBody PredictionRequest request) {
        return ResponseEntity.ok(inferenceService.makePrediction(modelId, versionId, request));
    }

    @Operation(summary = "Get prediction from the default version of a model",
               description = "Sends input data to the default version of an ML model and retrieves a prediction. " +
                             "The system automatically determines the default version.")
    @PostMapping("/{modelId}/predict")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<PredictionResponse> predictDefaultVersion(@Parameter(description = "ID of the model") @PathVariable Long modelId,
                                                                    @Valid @RequestBody PredictionRequest request) {
        return ResponseEntity.ok(inferenceService.makePredictionUsingDefaultVersion(modelId, request));
    }
}
```