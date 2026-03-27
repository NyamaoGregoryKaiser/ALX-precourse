```java
package com.ml.utilities.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml.utilities.dto.PredictionRequest;
import com.ml.utilities.dto.PredictionResponse;
import com.ml.utilities.entity.Model;
import com.ml.utilities.entity.ModelVersion;
import com.ml.utilities.exception.ResourceNotFoundException;
import com.ml.utilities.repository.ModelRepository;
import com.ml.utilities.repository.ModelVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class InferenceService {

    private final ModelRepository modelRepository;
    private final ModelVersionRepository modelVersionRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${inference.service.url}")
    private String inferenceServiceUrl; // e.g., http://inference-service:5000/predict

    @Cacheable(value = "predictions", key = "{#modelId, #versionId, #request.inputData.hashCode()}")
    public PredictionResponse makePrediction(Long modelId, Long versionId, PredictionRequest request) {
        long startTime = System.currentTimeMillis();

        Model model = modelRepository.findById(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("Model not found with id: " + modelId));

        ModelVersion version = modelVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Model version not found with id: " + versionId));

        if (!version.getModel().getId().equals(modelId)) {
            throw new IllegalArgumentException("Model version " + versionId + " does not belong to model " + modelId);
        }

        // For actual production, you'd send modelPath to inference service or it would load it based on id/version
        // Here, we'll assume the inference service knows how to handle generic requests.
        // Or, we pass model path directly. Let's pass it for demonstration.
        Map<String, Object> inferenceInput = Map.of(
                "model_path", version.getModelPath(),
                "input_data", request.getInputData()
        );

        String inferenceEndpoint = inferenceServiceUrl; // Or specific for model/version if inference service supports it

        try {
            log.info("Sending prediction request to inference service: {}", inferenceEndpoint);
            String jsonInput = objectMapper.writeValueAsString(inferenceInput);
            log.debug("Inference input: {}", jsonInput);
            
            // This assumes the Python inference service returns a map
            Map<String, Object> pythonResponse = restTemplate.postForObject(inferenceEndpoint, inferenceInput, Map.class);
            log.debug("Inference service response: {}", pythonResponse);

            if (pythonResponse == null || !pythonResponse.containsKey("prediction")) {
                throw new IllegalStateException("Inference service returned an invalid response.");
            }

            long endTime = System.currentTimeMillis();
            return PredictionResponse.builder()
                    .modelName(model.getName())
                    .versionNumber(version.getVersionNumber())
                    .prediction((Map<String, Object>) pythonResponse.get("prediction"))
                    .inferenceTimeMillis(endTime - startTime)
                    .build();

        } catch (JsonProcessingException e) {
            log.error("Error processing JSON for inference request: {}", e.getMessage());
            throw new RuntimeException("Failed to serialize prediction request", e);
        } catch (Exception e) {
            log.error("Error during prediction request to inference service: {}", e.getMessage());
            throw new RuntimeException("Failed to get prediction from inference service", e);
        }
    }

    public PredictionResponse makePredictionUsingDefaultVersion(Long modelId, PredictionRequest request) {
        Model model = modelRepository.findById(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("Model not found with id: " + modelId));

        ModelVersion defaultVersion = modelVersionRepository.findByModelIdAndIsDefaultTrue(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("No default version found for model id: " + modelId));

        return makePrediction(modelId, defaultVersion.getId(), request);
    }
}
```