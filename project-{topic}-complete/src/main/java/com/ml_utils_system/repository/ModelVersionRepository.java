```java
package com.ml_utils_system.repository;

import com.ml_utils_system.model.ModelVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for {@link ModelVersion} entities.
 * Provides standard CRUD operations and custom query methods for model versions.
 */
@Repository
public interface ModelVersionRepository extends JpaRepository<ModelVersion, Long> {

    /**
     * Finds a model version by its parent model ID and version number.
     *
     * @param modelId       The ID of the parent model.
     * @param versionNumber The version number string.
     * @return An Optional containing the found ModelVersion, or empty if not found.
     */
    Optional<ModelVersion> findByModelIdAndVersionNumber(Long modelId, String versionNumber);

    /**
     * Checks if a model version exists for a given model ID and version number.
     *
     * @param modelId       The ID of the parent model.
     * @param versionNumber The version number string.
     * @return True if the model version exists, false otherwise.
     */
    boolean existsByModelIdAndVersionNumber(Long modelId, String versionNumber);

    /**
     * Finds all model versions associated with a specific model ID.
     *
     * @param modelId The ID of the parent model.
     * @return A list of ModelVersion objects.
     */
    List<ModelVersion> findByModelId(Long modelId);

    /**
     * Finds a model version by its ID, eagerly fetching its associated features.
     * This helps avoid N+1 problems when retrieving features for a specific version.
     *
     * @param id The ID of the model version.
     * @return An Optional containing the found ModelVersion with features, or empty.
     */
    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"features"})
    Optional<ModelVersion> findById(Long id);
}
```