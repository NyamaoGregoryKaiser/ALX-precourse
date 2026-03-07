```java
package com.ml.utilities.system.util;

import com.ml.utilities.system.dto.DatasetDTO;
import com.ml.utilities.system.dto.ExperimentDTO;
import com.ml.utilities.system.dto.FeatureSetDTO;
import com.ml.utilities.system.dto.ModelDTO;
import com.ml.utilities.system.dto.UserDTO;
import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.Experiment;
import com.ml.utilities.system.model.FeatureSet;
import com.ml.utilities.system.model.Model;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

/**
 * Utility class for mapping between JPA entities and DTOs.
 * Provides static methods for conversion to avoid boilerplate in services.
 */
@Component
public class MapperUtil {

    // --- User Mappers ---
    public static User toUser(UserDTO userDTO) {
        User user = new User();
        user.setId(userDTO.getId());
        user.setUsername(userDTO.getUsername());
        user.setEmail(userDTO.getEmail());
        user.setPassword(userDTO.getPassword()); // Password will be encoded in service layer
        // Roles are handled in AuthService during registration, not directly via DTO conversion here for simplicity
        return user;
    }

    public static UserDTO toUserDTO(User user) {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(user.getId());
        userDTO.setUsername(user.getUsername());
        userDTO.setEmail(user.getEmail());
        userDTO.setCreatedAt(user.getCreatedAt());
        userDTO.setUpdatedAt(user.getUpdatedAt());
        if (user.getRoles() != null) {
            userDTO.setRoles(user.getRoles().stream()
                    .map(Role::getName)
                    .collect(Collectors.toSet()));
        }
        return userDTO;
    }

    // --- Experiment Mappers ---
    public static Experiment toExperiment(ExperimentDTO experimentDTO) {
        Experiment experiment = new Experiment();
        experiment.setId(experimentDTO.getId());
        experiment.setName(experimentDTO.getName());
        experiment.setDescription(experimentDTO.getDescription());
        experiment.setStartDate(experimentDTO.getStartDate());
        experiment.setEndDate(experimentDTO.getEndDate());
        experiment.setStatus(experimentDTO.getStatus());
        experiment.setObjective(experimentDTO.getObjective());
        // createdBy and timestamps are set in service layer
        return experiment;
    }

    public static ExperimentDTO toExperimentDTO(Experiment experiment) {
        ExperimentDTO experimentDTO = new ExperimentDTO();
        experimentDTO.setId(experiment.getId());
        experimentDTO.setName(experiment.getName());
        experimentDTO.setDescription(experiment.getDescription());
        experimentDTO.setStartDate(experiment.getStartDate());
        experimentDTO.setEndDate(experiment.getEndDate());
        experimentDTO.setStatus(experiment.getStatus());
        experimentDTO.setObjective(experiment.getObjective());
        experimentDTO.setCreatedAt(experiment.getCreatedAt());
        experimentDTO.setUpdatedAt(experiment.getUpdatedAt());
        if (experiment.getCreatedBy() != null) {
            experimentDTO.setCreatedByUserId(experiment.getCreatedBy().getId());
        }
        return experimentDTO;
    }

    // --- Model Mappers ---
    public static Model toModel(ModelDTO modelDTO) {
        Model model = new Model();
        model.setId(modelDTO.getId());
        model.setName(modelDTO.getName());
        model.setVersion(modelDTO.getVersion());
        model.setModelUri(modelDTO.getModelUri());
        model.setFramework(modelDTO.getFramework());
        model.setAccuracy(modelDTO.getAccuracy());
        model.setF1Score(modelDTO.getF1Score());
        model.setPrecisionScore(modelDTO.getPrecisionScore());
        model.setRecallScore(modelDTO.getRecallScore());
        // Associations (experiment, dataset, featureSet) and createdBy are set in service layer
        return model;
    }

    public static ModelDTO toModelDTO(Model model) {
        ModelDTO modelDTO = new ModelDTO();
        modelDTO.setId(model.getId());
        modelDTO.setName(model.getName());
        modelDTO.setVersion(model.getVersion());
        modelDTO.setModelUri(model.getModelUri());
        modelDTO.setFramework(model.getFramework());
        modelDTO.setAccuracy(model.getAccuracy());
        modelDTO.setF1Score(model.getf1Score());
        modelDTO.setPrecisionScore(model.getPrecisionScore());
        modelDTO.setRecallScore(model.getRecallScore());
        modelDTO.setCreatedAt(model.getCreatedAt());
        modelDTO.setUpdatedAt(model.getUpdatedAt());
        if (model.getExperiment() != null) {
            modelDTO.setExperimentId(model.getExperiment().getId());
        }
        if (model.getDataset() != null) {
            modelDTO.setDatasetId(model.getDataset().getId());
        }
        if (model.getFeatureSet() != null) {
            modelDTO.setFeatureSetId(model.getFeatureSet().getId());
        }
        if (model.getCreatedBy() != null) {
            modelDTO.setCreatedByUserId(model.getCreatedBy().getId());
        }
        return modelDTO;
    }

    // --- Dataset Mappers ---
    public static Dataset toDataset(DatasetDTO datasetDTO) {
        Dataset dataset = new Dataset();
        dataset.setId(datasetDTO.getId());
        dataset.setName(datasetDTO.getName());
        dataset.setVersion(datasetDTO.getVersion());
        dataset.setSourceUri(datasetDTO.getSourceUri());
        dataset.setDescription(datasetDTO.getDescription());
        dataset.setSizeMb(datasetDTO.getSizeMb());
        dataset.setRowCount(datasetDTO.getRowCount());
        dataset.setFormat(datasetDTO.getFormat());
        // createdBy and timestamps are set in service layer
        return dataset;
    }

    public static DatasetDTO toDatasetDTO(Dataset dataset) {
        DatasetDTO datasetDTO = new DatasetDTO();
        datasetDTO.setId(dataset.getId());
        datasetDTO.setName(dataset.getName());
        datasetDTO.setVersion(dataset.getVersion());
        datasetDTO.setSourceUri(dataset.getSourceUri());
        datasetDTO.setDescription(dataset.getDescription());
        datasetDTO.setSizeMb(dataset.getSizeMb());
        datasetDTO.setRowCount(dataset.getRowCount());
        datasetDTO.setFormat(dataset.getFormat());
        datasetDTO.setCreatedAt(dataset.getCreatedAt());
        datasetDTO.setUpdatedAt(dataset.getUpdatedAt());
        if (dataset.getCreatedBy() != null) {
            datasetDTO.setCreatedByUserId(dataset.getCreatedBy().getId());
        }
        return datasetDTO;
    }

    // --- FeatureSet Mappers ---
    public static FeatureSet toFeatureSet(FeatureSetDTO featureSetDTO) {
        FeatureSet featureSet = new FeatureSet();
        featureSet.setId(featureSetDTO.getId());
        featureSet.setName(featureSetDTO.getName());
        featureSet.setVersion(featureSetDTO.getVersion());
        featureSet.setDescription(featureSetDTO.getDescription());
        featureSet.setTransformationCodeUri(featureSetDTO.getTransformationCodeUri());
        // sourceDataset and createdBy are set in service layer
        return featureSet;
    }

    public static FeatureSetDTO toFeatureSetDTO(FeatureSet featureSet) {
        FeatureSetDTO featureSetDTO = new FeatureSetDTO();
        featureSetDTO.setId(featureSet.getId());
        featureSetDTO.setName(featureSet.getName());
        featureSetDTO.setVersion(featureSet.getVersion());
        featureSetDTO.setDescription(featureSet.getDescription());
        featureSetDTO.setTransformationCodeUri(featureSet.getTransformationCodeUri());
        featureSetDTO.setCreatedAt(featureSet.getCreatedAt());
        featureSetDTO.setUpdatedAt(featureSet.getUpdatedAt());
        if (featureSet.getSourceDataset() != null) {
            featureSetDTO.setSourceDatasetId(featureSet.getSourceDataset().getId());
        }
        if (featureSet.getCreatedBy() != null) {
            featureSetDTO.setCreatedByUserId(featureSet.getCreatedBy().getId());
        }
        return featureSetDTO;
    }
}
```